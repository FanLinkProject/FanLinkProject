package org.example.backend.ivs.client;

import java.time.Instant;

// IVS SDK 응답을 도메인에서 쓰기 쉽게 감싼 결과 객체.
public record IvsPlaybackTokenResult(
        String token,
        Instant expiresAt
) {
}
