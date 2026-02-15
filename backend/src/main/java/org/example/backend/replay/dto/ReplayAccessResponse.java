package org.example.backend.replay.dto;

import java.time.Instant;

// Replay 접근 게이트 응답 DTO.
public record ReplayAccessResponse(
        String playbackUrl,
        String playbackPathPattern,
        Instant expiresAt
) {
}
