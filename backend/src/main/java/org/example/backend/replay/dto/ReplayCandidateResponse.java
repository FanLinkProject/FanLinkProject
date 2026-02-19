package org.example.backend.replay.dto;

import java.time.Instant;

// Replay 후보 응답 DTO.
public record ReplayCandidateResponse(
        Long liveSessionId,
        Long artistId,
        boolean isPaid,
        Instant endedAt,
        String recordingS3Bucket,
        String recordingS3Prefix
) {
}
