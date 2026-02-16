package org.example.backend.replay.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.example.backend.replay.entity.ReplayAccessType;

// Replay 발행 요청 DTO.
public record ReplayPublishRequest(
        @NotNull
        Long artistId,
        @NotNull
        Long liveSessionId,
        @NotNull
        ReplayAccessType accessType,
        @Size(max = 200)
        String title
) {
}
