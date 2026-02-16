package org.example.backend.replay.gateway;

import java.time.Instant;

public record LiveSessionRecordingInfo(
        Long liveSessionId,
        Long artistId,
        boolean isPaid,
        LiveSessionRecordingStatus status,
        Instant endedAt,
        String recordingS3Bucket,
        String recordingS3Prefix
) {
}
