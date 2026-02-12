package org.example.backend.ivs.gateway;

import lombok.RequiredArgsConstructor;
import org.example.backend.live_session.dto.response.LiveSessionResponse;
import org.example.backend.live_session.service.LiveSessionService;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class LiveSessionServiceGateway implements LiveSessionGateway {

    private final LiveSessionService liveSessionService;

    // LiveSession 서비스를 통해 세션 정보를 조회한다.
    @Override
    public LiveSessionInfo getById(Long liveSessionId) {
        LiveSessionResponse response = liveSessionService.getLiveSession(liveSessionId);
        return toInfo(response);
    }

    // LiveSessionResponse를 IVS용 DTO로 변환한다.
    private LiveSessionInfo toInfo(LiveSessionResponse response) {
        return new LiveSessionInfo(
                response.getId(),
                response.getArtistId(),
                response.getChannelArn(),
                Boolean.TRUE.equals(response.getIsPaid()),
                mapStatus(response.getStatus()),
                null
        );
    }

    // LiveSession 상태를 IVS 도메인 상태로 변환한다.
    private LiveSessionStatus mapStatus(org.example.backend.live_session.enums.LiveSessionStatus status) {
        if (status == null) {
            return LiveSessionStatus.EXPIRED;
        }
        return switch (status) {
            case LIVE -> LiveSessionStatus.LIVE;
            case ENDED -> LiveSessionStatus.ENDED;
            case RECORDED -> LiveSessionStatus.RECORDED;
            case READY -> LiveSessionStatus.READY;
            case REJECTED -> LiveSessionStatus.REJECTED;
            case EXPIRED -> LiveSessionStatus.EXPIRED;
        };
    }
}
