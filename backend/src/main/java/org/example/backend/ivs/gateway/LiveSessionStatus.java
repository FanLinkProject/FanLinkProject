package org.example.backend.ivs.gateway;

// LiveSession 상태를 IVS 도메인에서 사용하는 표준 enum.
public enum LiveSessionStatus {
    LIVE,
    ENDED,
    RECORDED,
    READY,
    REJECTED,
    EXPIRED
}
