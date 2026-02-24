package org.example.backend.replay.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.media_asset.config.AwsProperties;
import org.example.backend.replay.dto.ReplayCandidateResponse;
import org.example.backend.replay.dto.ReplayResponse;
import org.example.backend.replay.entity.Replay;
import org.example.backend.replay.entity.ReplayStatus;
import org.example.backend.replay.exception.ReplayErrorCode;
import org.example.backend.replay.exception.ReplayException;
import org.example.backend.replay.gateway.LiveSessionGateway;
import org.example.backend.replay.gateway.LiveSessionRecordingInfo;
import org.example.backend.replay.gateway.LiveSessionRecordingStatus;
import org.example.backend.replay.repository.ReplayRepository;
import org.example.backend.replay.util.PlaybackUrlCalculator;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.service.ArtistPermissionService;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReplayQueryService {

    private final ReplayRepository replayRepository;
    @Qualifier("replayLiveSessionServiceGateway")
    private final LiveSessionGateway liveSessionGateway;
    private final ArtistPermissionService artistPermissionService;
    private final PlaybackUrlCalculator playbackUrlCalculator;
    private final AwsProperties awsProperties;

    // 아티스트별 발행된 Replay 목록을 조회한다. (공개용)
    public List<ReplayResponse> listByArtist(Long artistId) {
        List<Replay> replays = replayRepository.findAllByArtistIdOrderByCreatedAtDesc(artistId);
        return replays.stream()
                .filter(r -> r.getStatus() == ReplayStatus.PUBLISHED)
                .map(this::toReplayResponse)
                .toList();
    }

    // Replay 후보 목록을 조회한다. 방송 주체(session.artistId)만 발행 가능하므로 본인 채널 세션만 반환.
    public List<ReplayCandidateResponse> listCandidates(Long artistId, Long userId, UserRole role) {
        if (!artistPermissionService.canManagePage(artistId, userId, role, true)) {
            throw new ReplayException(ReplayErrorCode.FORBIDDEN_OPERATION);
        }
        List<LiveSessionRecordingInfo> candidates = liveSessionGateway.findCandidates(userId);
        return candidates.stream()
                .filter(this::isRecordedOrReady)
                .filter(info -> !replayRepository.existsByLiveSessionId(info.liveSessionId()))
                .map(this::toCandidateResponse)
                .toList();
    }

    // Replay 단건을 조회한다.
    public ReplayResponse getReplay(Long replayId) {
        Replay replay = replayRepository.findById(replayId)
                .orElseThrow(() -> new ReplayException(ReplayErrorCode.REPLAY_NOT_FOUND));
        return toReplayResponse(replay);
    }

    private ReplayResponse toReplayResponse(Replay replay) {
        String playbackUrl = playbackUrlCalculator.buildPlaybackUrl(awsProperties.getCloudfront().getDomain(), replay);
        String pattern = playbackUrlCalculator.buildPlaybackPathPattern(awsProperties.getCloudfront().getDomain(), replay);
        String thumbnailUrl = buildThumbnailUrl(replay);
        return new ReplayResponse(
                replay.getId(),
                replay.getArtistId(),
                replay.getLiveSessionId(),
                replay.getAccessType(),
                replay.getStatus(),
                playbackUrl,
                pattern,
                thumbnailUrl,
                replay.getCreatedAt(),
                replay.getPublishedAt()
        );
    }

    private String buildThumbnailUrl(Replay replay) {
        String key = replay.getThumbnailKey();
        if (key == null || key.isBlank()) {
            return null;
        }
        String domain = awsProperties.getCloudfront().getDomain();
        if (domain == null || domain.isBlank()) {
            return null;
        }
        domain = domain.replace("https://", "").replace("http://", "").trim();
        return "https://" + domain + "/" + (key.startsWith("/") ? key.substring(1) : key);
    }

    // 후보 라이브 세션 응답을 구성한다.
    private ReplayCandidateResponse toCandidateResponse(LiveSessionRecordingInfo info) {
        return new ReplayCandidateResponse(
                info.liveSessionId(),
                info.artistId(),
                info.isPaid(),
                info.endedAt(),
                info.recordingS3Bucket(),
                info.recordingS3Prefix()
        );
    }

    // RECORDED/READY 상태만 통과시킨다.
    private boolean isRecordedOrReady(LiveSessionRecordingInfo info) {
        return info.status() == LiveSessionRecordingStatus.RECORDED
                || info.status() == LiveSessionRecordingStatus.READY;
    }
}
