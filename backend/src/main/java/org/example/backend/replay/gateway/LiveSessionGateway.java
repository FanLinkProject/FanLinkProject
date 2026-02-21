package org.example.backend.replay.gateway;

import java.util.List;

public interface LiveSessionGateway {

    // liveSessionId로 녹화 정보를 조회한다.
    LiveSessionRecordingInfo getById(Long liveSessionId);

    /**
     * 현재 사용자(userId)가 발행 가능한 후보 라이브 세션 목록을 조회한다.
     * 방송 주체(session.artistId)만 발행 가능하므로, session.artistId == userId 인 세션만 반환한다.
     */
    List<LiveSessionRecordingInfo> findCandidates(Long userId);
}
