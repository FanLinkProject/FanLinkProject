package org.example.backend.replay.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.media_asset.config.AwsProperties;
import org.example.backend.media_asset.entity.MediaAsset;
import org.example.backend.media_asset.entity.MediaAssetCategory;
import org.example.backend.media_asset.entity.MediaAssetStatus;
import org.example.backend.media_asset.exception.MediaAssetErrorCode;
import org.example.backend.media_asset.exception.MediaAssetException;
import org.example.backend.media_asset.repository.MediaAssetRepository;
import org.example.backend.replay.dto.ReplayAccessResponse;
import org.example.backend.replay.dto.ReplayAccessResult;
import org.example.backend.replay.dto.ReplayCreateManualRequest;
import org.example.backend.replay.dto.ReplayCreateManualResponse;
import org.example.backend.replay.dto.ReplayPublishRequest;
import org.example.backend.replay.dto.ReplayPublishResponse;
import org.example.backend.replay.dto.ReplayUpdateRequest;
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
import org.example.backend.user.service.ArtistPermissionService;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ReplayCommandService {

    private final ReplayRepository replayRepository;
    private final MediaAssetRepository mediaAssetRepository;
    @Qualifier("replayLiveSessionServiceGateway")
    private final LiveSessionGateway liveSessionGateway;
    private final ArtistPermissionService artistPermissionService;
    @Qualifier("replayDefaultSubscriptionGateway")
    private final SubscriptionGateway subscriptionGateway;
    private final ObjectProvider<CloudFrontCookieSigner> cookieSignerProvider;
    private final PlaybackUrlCalculator playbackUrlCalculator;
    private final ReplayAccessPolicy replayAccessPolicy;
    private final AwsProperties awsProperties;
    @Value("${replay.access-gate.enabled:true}")
    private boolean accessGateEnabled;

    // Replay 발행을 처리한다. 방송 주체(session.artistId)만 발행 가능.
    public ReplayPublishResponse publish(ReplayPublishRequest request, Long userId, UserRole role) {
        if (!artistPermissionService.canManagePage(request.artistId(), userId, role, true)) {
            throw new ReplayException(ReplayErrorCode.FORBIDDEN_OPERATION);
        }

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
        Instant now = Instant.now();
        Replay replay = replayRepository.findByLiveSessionId(request.liveSessionId()).orElse(null);
        if (replay != null) {
            if (replay.getStatus() == ReplayStatus.PUBLISHED) {
                throw new ReplayException(ReplayErrorCode.DUPLICATE_PUBLISH);
            }
            replay.markPublished(now);
        } else {
            replay = new Replay(
                    request.artistId(),
                    request.liveSessionId(),
                    request.accessType(),
                    ReplayStatus.PUBLISHED,
                    session.recordingS3Bucket(),
                    session.recordingS3Prefix(),
                    now,
                    request.title()
            );
        }
        if (request.title() != null && !request.title().isBlank()) {
            replay.updateTitle(request.title().trim());
        }
        replayRepository.save(replay);

        if (request.thumbnailMediaAssetId() != null) {
            MediaAsset mediaAsset = mediaAssetRepository.findById(request.thumbnailMediaAssetId())
                    .orElseThrow(() -> new MediaAssetException(MediaAssetErrorCode.MEDIA_ASSET_NOT_FOUND));
            if (mediaAsset.getCategory() != MediaAssetCategory.REPLAY_THUMBNAIL) {
                throw new MediaAssetException(MediaAssetErrorCode.MEDIA_ASSET_ACCESS_DENIED, "다시보기 썸네일이 아닌 미디어입니다.");
            }
            if (mediaAsset.getStatus() != MediaAssetStatus.READY) {
                throw new MediaAssetException(MediaAssetErrorCode.INVALID_MEDIA_ASSET_STATUS, "업로드가 완료된 썸네일만 사용할 수 있습니다.");
            }
            replay.updateThumbnailKey(mediaAsset.getObjectKey());
        }

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
        if (playbackUrl == null || pathPattern == null) {
            throw new ReplayException(ReplayErrorCode.REPLAY_NOT_READY, "재생 준비가 되지 않았습니다.");
        }
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
        String cfPolicy = null;
        String cfSignature = null;
        String cfKeyPairId = null;
        for (String cookie : cookies) {
            String[] parts = cookie.split(";")[0].split("=", 2);
            if (parts.length < 2) continue;
            switch (parts[0].trim()) {
                case "CloudFront-Policy" -> cfPolicy = parts[1].trim();
                case "CloudFront-Signature" -> cfSignature = parts[1].trim();
                case "CloudFront-Key-Pair-Id" -> cfKeyPairId = parts[1].trim();
            }
        }
        ReplayAccessResponse response = new ReplayAccessResponse(
                playbackUrl,
                pathPattern,
                Instant.now().plusSeconds(ttl.getSeconds()),
                cfPolicy,
                cfSignature,
                cfKeyPairId
        );
        return new ReplayAccessResult(response, cookies);
    }

    /**
     * 다시보기 수동 업로드 슬롯을 생성한다.
     * 라이브 녹화가 없을 때(직접 녹화본·행사/TV 영상 업로드) 사용.
     * 반환된 replayId로 REPLAY_VIDEO presign 후 업로드 → complete 시 MediaConvert 자동 제출.
     */
    public ReplayCreateManualResponse createManualReplay(ReplayCreateManualRequest request, Long userId, UserRole role) {
        if (!artistPermissionService.canManagePage(request.artistId(), userId, role, true)) {
            throw new ReplayException(ReplayErrorCode.FORBIDDEN_OPERATION);
        }
        Replay replay = new Replay(
                request.artistId(),
                null,
                request.accessType(),
                ReplayStatus.UPLOADING,
                null,
                null,
                null,
                request.title() != null ? request.title().trim() : null
        );
        replayRepository.save(replay);
        return new ReplayCreateManualResponse(
                replay.getId(),
                replay.getArtistId(),
                replay.getAccessType(),
                replay.getStatus(),
                replay.getCreatedAt()
        );
    }

    /**
     * 수동 업로드 Replay를 발행한다.
     * 상태가 READY(HLS 변환 완료)일 때만 가능.
     */
    public ReplayPublishResponse publishManualReplay(Long replayId, Long userId, UserRole role) {
        Replay replay = replayRepository.findById(replayId)
                .orElseThrow(() -> new ReplayException(ReplayErrorCode.REPLAY_NOT_FOUND));
        if (replay.getLiveSessionId() != null) {
            throw new ReplayException(ReplayErrorCode.FORBIDDEN_OPERATION, "라이브 발행은 /publish를 사용하세요.");
        }
        if (!artistPermissionService.canManagePage(replay.getArtistId(), userId, role, true)) {
            throw new ReplayException(ReplayErrorCode.FORBIDDEN_OPERATION);
        }
        if (replay.getStatus() != ReplayStatus.READY) {
            throw new ReplayException(ReplayErrorCode.INVALID_SESSION_STATE,
                    "변환 완료(READY) 후에만 발행할 수 있습니다. 현재 상태: " + replay.getStatus());
        }
        Instant now = Instant.now();
        replay.markPublished(now);
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

    public Replay updateReplay(Long replayId, ReplayUpdateRequest req, Long userId, UserRole role) {
        Replay replay = replayRepository.findById(replayId)
                .orElseThrow(() -> new ReplayException(ReplayErrorCode.REPLAY_NOT_FOUND));
        if (!artistPermissionService.canManagePage(replay.getArtistId(), userId, role, true)) {
            throw new ReplayException(ReplayErrorCode.FORBIDDEN_OPERATION);
        }
        if (req.title() != null) {
            replay.updateTitle(req.title().trim());
        }
        if (req.accessType() != null) {
            replay.updateAccessType(req.accessType());
        }
        return replayRepository.save(replay);
    }

    public void deleteReplay(Long replayId, Long userId, UserRole role) {
        Replay replay = replayRepository.findById(replayId)
                .orElseThrow(() -> new ReplayException(ReplayErrorCode.REPLAY_NOT_FOUND));
        if (!artistPermissionService.canManagePage(replay.getArtistId(), userId, role, true)) {
            throw new ReplayException(ReplayErrorCode.FORBIDDEN_OPERATION);
        }
        replayRepository.delete(replay);
    }

    // RECORDED/READY 상태만 통과시킨다.
    private boolean isRecordedOrReady(LiveSessionRecordingStatus status) {
        return status == LiveSessionRecordingStatus.RECORDED
                || status == LiveSessionRecordingStatus.READY;
    }
}
