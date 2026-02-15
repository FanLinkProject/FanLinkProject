package org.example.backend.replay.gateway;

import java.util.List;

public interface LiveSessionGateway {

    // liveSessionId로 녹화 정보를 조회한다.
    LiveSessionRecordingInfo getById(Long liveSessionId);

    // 아티스트별 후보 라이브 세션 목록을 조회한다.
    List<LiveSessionRecordingInfo> findCandidates(Long artistId);
}
