package org.example.backend.ivs.dto;

import java.time.OffsetDateTime;

// IVS Playback Token 발급 응답 DTO.
public record CreatePlaybackTokenResponse(
        String token,
        OffsetDateTime expiresAt,
        int ttlSeconds,
        int recommendedRefreshInSeconds
) {
}
