package org.example.backend.replay.dto;

import org.example.backend.replay.entity.ReplayAccessType;
import org.example.backend.replay.entity.ReplayStatus;

import java.time.OffsetDateTime;

// Replay 조회 응답 DTO.
public record ReplayResponse(
        Long replayId,
        Long artistId,
        Long liveSessionId,
        ReplayAccessType accessType,
        ReplayStatus status,
        String playbackUrl,
        String playbackPathPattern,
        OffsetDateTime createdAt,
        OffsetDateTime publishedAt
) {
}
