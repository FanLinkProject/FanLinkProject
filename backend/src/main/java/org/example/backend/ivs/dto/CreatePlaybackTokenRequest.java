package org.example.backend.ivs.dto;

import jakarta.validation.constraints.NotNull;

// IVS Playback Token 발급 요청 DTO.
public record CreatePlaybackTokenRequest(
        @NotNull
        Long liveSessionId,
        @NotNull
        Integer ttlSeconds
) {
}
