package org.example.backend.replay.dto;

import org.example.backend.replay.entity.ReplayAccessType;
import org.example.backend.replay.entity.ReplayStatus;

import java.time.OffsetDateTime;

// Replay 발행 응답 DTO.
public record ReplayPublishResponse(
        Long replayId,
        Long artistId,
        Long liveSessionId,
        ReplayAccessType accessType,
        ReplayStatus status,
        String playbackUrl,
        OffsetDateTime publishedAt
) {
}
