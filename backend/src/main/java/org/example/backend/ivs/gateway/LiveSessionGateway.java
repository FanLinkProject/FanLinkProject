package org.example.backend.ivs.gateway;

public interface LiveSessionGateway {

    // liveSessionId로 세션 정보를 조회한다.
    LiveSessionInfo getById(Long liveSessionId);
}
