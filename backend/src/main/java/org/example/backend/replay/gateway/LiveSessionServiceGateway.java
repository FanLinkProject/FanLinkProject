package org.example.backend.replay.gateway;

import lombok.RequiredArgsConstructor;
import org.example.backend.live_session.dto.response.LiveSessionCandidateResponse;
import org.example.backend.live_session.dto.response.LiveSessionResponse;
import org.example.backend.live_session.enums.LiveSessionStatus;
import org.example.backend.live_session.service.LiveSessionService;
import org.springframework.stereotype.Component;

import java.util.List;

@Component("replayLiveSessionServiceGateway")
@RequiredArgsConstructor
public class LiveSessionServiceGateway implements LiveSessionGateway {

    private final LiveSessionService liveSessionService;

    // liveSessionId로 녹화 정보를 조회한다.
    @Override
    public LiveSessionRecordingInfo getById(Long liveSessionId) {
        LiveSessionResponse response = liveSessionService.getLiveSession(liveSessionId);
        return toRecordingInfo(response);
    }

    // 아티스트별 후보 라이브 세션 목록을 조회한다.
    @Override
    public List<LiveSessionRecordingInfo> findCandidates(Long artistId) {
        return liveSessionService.getLiveSessionsByArtist(artistId, null)
                .stream()
                .map(this::toRecordingInfo)
                .filter(this::isRecordedOrReady)
                .toList();
    }

    // LiveSessionResponse를 Replay용 DTO로 변환한다.
    private LiveSessionRecordingInfo toRecordingInfo(LiveSessionResponse response) {
        return new LiveSessionRecordingInfo(
                response.getId(),
                response.getArtistId(),
                Boolean.TRUE.equals(response.getIsPaid()),
                mapStatus(response.getStatus()),
                response.getEndedAt() == null ? null : response.getEndedAt().toInstant(),
                response.getRecordingS3Bucket(),
                response.getRecordingS3Prefix()
        );
    }

    // LiveSessionCandidateResponse를 Replay용 DTO로 변환한다.
    private LiveSessionRecordingInfo toRecordingInfo(LiveSessionCandidateResponse response) {
        return new LiveSessionRecordingInfo(
                response.getId(),
                response.getArtistId(),
                Boolean.TRUE.equals(response.getIsPaid()),
                LiveSessionRecordingStatus.RECORDED,
                response.getEndedAt() == null ? null : response.getEndedAt().toInstant(),
                response.getRecordingS3Bucket(),
                response.getRecordingS3Prefix()
        );
    }

    // RECORDED/READY 상태만 후보로 인정한다.
    private boolean isRecordedOrReady(LiveSessionRecordingInfo info) {
        return info.status() == LiveSessionRecordingStatus.RECORDED
                || info.status() == LiveSessionRecordingStatus.READY;
    }

    // 라이브 세션 상태를 Replay 도메인 상태로 매핑한다.
    private LiveSessionRecordingStatus mapStatus(LiveSessionStatus status) {
        if (status == null) {
            return LiveSessionRecordingStatus.ENDED;
        }
        return switch (status) {
            case LIVE -> LiveSessionRecordingStatus.LIVE;
            case ENDED -> LiveSessionRecordingStatus.ENDED;
            case RECORDED -> LiveSessionRecordingStatus.RECORDED;
            case READY -> LiveSessionRecordingStatus.READY;
            case REJECTED -> LiveSessionRecordingStatus.REJECTED;
            case EXPIRED -> LiveSessionRecordingStatus.EXPIRED;
        };
    }
}
