package org.example.backend.ivs.dto;

import java.time.Instant;

// IVS Playback Token 발급 응답 DTO.
public record CreatePlaybackTokenResponse(
        String token,
        String playbackUrl,
        Instant expiresAt,
        int ttlSeconds,
        int recommendedRefreshInSeconds
) {
}
