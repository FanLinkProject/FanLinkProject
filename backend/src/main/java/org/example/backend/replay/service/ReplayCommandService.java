package org.example.backend.replay.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.media_asset.config.AwsProperties;
import org.example.backend.replay.dto.ReplayAccessResponse;
import org.example.backend.replay.dto.ReplayAccessResult;
import org.example.backend.replay.dto.ReplayPublishRequest;
import org.example.backend.replay.dto.ReplayPublishResponse;
import org.example.backend.replay.entity.Replay;
import org.example.backend.replay.entity.ReplayAccessType;
import org.example.backend.replay.entity.ReplayStatus;
import org.example.backend.replay.exception.ReplayErrorCode;
import org.example.backend.replay.exception.ReplayException;
import org.example.backend.replay.gateway.LiveSessionGateway;
import org.example.backend.replay.gateway.LiveSessionRecordingInfo;
import org.example.backend.replay.gateway.LiveSessionRecordingStatus;
import org.example.backend.replay.policy.ReplayAccessPolicy;
import org.example.backend.replay.repository.ReplayRepository;
import org.example.backend.replay.util.CloudFrontCookieSigner;
import org.example.backend.replay.util.PlaybackUrlCalculator;
import org.example.backend.user.enums.UserRole;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ReplayCommandService {

    private final ReplayRepository replayRepository;
    @Qualifier("replayLiveSessionServiceGateway")
    private final LiveSessionGateway liveSessionGateway;
    @Qualifier("replayDefaultSubscriptionGateway")
    private final SubscriptionGateway subscriptionGateway;
    private final ObjectProvider<CloudFrontCookieSigner> cookieSignerProvider;
    private final PlaybackUrlCalculator playbackUrlCalculator;
    private final ReplayAccessPolicy replayAccessPolicy;
    private final AwsProperties awsProperties;
    @Value("${replay.access-gate.enabled:true}")
    private boolean accessGateEnabled;

    // Replay 발행을 처리한다.
    public ReplayPublishResponse publish(ReplayPublishRequest request, Long userId, UserRole role) {
        validateArtistOwner(request.artistId(), userId, role);

        LiveSessionRecordingInfo session = liveSessionGateway.getById(request.liveSessionId());
        if (!request.artistId().equals(session.artistId())) {
            throw new ReplayException(ReplayErrorCode.FORBIDDEN_OPERATION);
        }
        if (!isRecordedOrReady(session.status())) {
            throw new ReplayException(ReplayErrorCode.INVALID_SESSION_STATE);
        }
        if (session.recordingS3Bucket() == null || session.recordingS3Bucket().isBlank()
                || session.recordingS3Prefix() == null || session.recordingS3Prefix().isBlank()) {
            throw new ReplayException(ReplayErrorCode.RECORDING_NOT_READY);
        }
        if (replayRepository.existsByLiveSessionId(request.liveSessionId())) {
            throw new ReplayException(ReplayErrorCode.DUPLICATE_PUBLISH);
        }

        OffsetDateTime now = OffsetDateTime.now();
        Replay replay = new Replay(
                request.artistId(),
                request.liveSessionId(),
                request.accessType(),
                ReplayStatus.PUBLISHED,
                session.recordingS3Bucket(),
                session.recordingS3Prefix(),
                now
        );
        replayRepository.save(replay);

        String playbackUrl = playbackUrlCalculator.buildPlaybackUrl(awsProperties.getCloudfront().getDomain(), replay);
        return new ReplayPublishResponse(
                replay.getId(),
                replay.getArtistId(),
                replay.getLiveSessionId(),
                replay.getAccessType(),
                replay.getStatus(),
                playbackUrl,
                replay.getPublishedAt()
        );
    }

    // Replay 접근 게이트를 처리한다.
    @Transactional(readOnly = true)
    public ReplayAccessResult issueAccessCookie(Long replayId, Long userId) {
        if (!accessGateEnabled) {
            throw new ReplayException(ReplayErrorCode.FORBIDDEN_OPERATION, "Access gate disabled");
        }
        Replay replay = replayRepository.findById(replayId)
                .orElseThrow(() -> new ReplayException(ReplayErrorCode.REPLAY_NOT_FOUND));
        if (userId == null) {
            throw new ReplayException(ReplayErrorCode.FORBIDDEN_OPERATION);
        }

        boolean subscribed = replay.getAccessType() == ReplayAccessType.PAID
                && subscriptionGateway.isSubscribed(userId, replay.getArtistId());
        if (!replayAccessPolicy.canIssueAccess(replay, subscribed)) {
            if (replay.getAccessType() == ReplayAccessType.PAID) {
                throw new ReplayException(ReplayErrorCode.SUBSCRIPTION_REQUIRED);
            }
            throw new ReplayException(ReplayErrorCode.FORBIDDEN_OPERATION);
        }

        Duration ttl = replay.getAccessType() == ReplayAccessType.PAID
                ? Duration.ofMinutes(10)
                : Duration.ofMinutes(60);
        String playbackUrl = playbackUrlCalculator.buildPlaybackUrl(awsProperties.getCloudfront().getDomain(), replay);
        String pathPattern = playbackUrlCalculator.buildPlaybackPathPattern(awsProperties.getCloudfront().getDomain(), replay);
        CloudFrontCookieSigner cookieSigner = cookieSignerProvider.getIfAvailable();
        if (cookieSigner == null) {
            throw new ReplayException(ReplayErrorCode.COOKIE_ISSUE_FAILED, "CloudFront signer is not configured");
        }
        List<String> cookies;
        try {
            cookies = cookieSigner.issueSignedCookies(pathPattern, ttl);
        } catch (RuntimeException ex) {
            throw new ReplayException(ReplayErrorCode.COOKIE_ISSUE_FAILED);
        }
        ReplayAccessResponse response = new ReplayAccessResponse(
                playbackUrl,
                pathPattern,
                OffsetDateTime.now().plusSeconds(ttl.getSeconds())
        );
        return new ReplayAccessResult(response, cookies);
    }

    // ARTIST 본인인지 확인한다.
    private void validateArtistOwner(Long artistId, Long userId, UserRole role) {
        if (userId == null || role == null) {
            throw new ReplayException(ReplayErrorCode.FORBIDDEN_OPERATION);
        }
        if (role != UserRole.ARTIST || !artistId.equals(userId)) {
            throw new ReplayException(ReplayErrorCode.FORBIDDEN_OPERATION);
        }
    }

    // RECORDED/READY 상태만 통과시킨다.
    private boolean isRecordedOrReady(LiveSessionRecordingStatus status) {
        return status == LiveSessionRecordingStatus.RECORDED
                || status == LiveSessionRecordingStatus.READY;
    }
}
