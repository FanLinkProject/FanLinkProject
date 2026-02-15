package org.example.backend.replay.gateway;

import java.time.OffsetDateTime;

public record LiveSessionRecordingInfo(
        Long liveSessionId,
        Long artistId,
        boolean isPaid,
        LiveSessionRecordingStatus status,
        OffsetDateTime endedAt,
        String recordingS3Bucket,
        String recordingS3Prefix
) {
}
