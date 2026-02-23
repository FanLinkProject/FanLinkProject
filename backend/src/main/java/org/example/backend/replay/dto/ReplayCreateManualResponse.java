package org.example.backend.replay.dto;

import org.example.backend.replay.entity.ReplayAccessType;
import org.example.backend.replay.entity.ReplayStatus;

import java.time.Instant;

/** 수동 업로드용 Replay 슬롯 생성 응답. replayId로 영상 presign 업로드 후 complete 호출. */
public record ReplayCreateManualResponse(
        Long replayId,
        Long artistId,
        ReplayAccessType accessType,
        ReplayStatus status,
        Instant createdAt
) {
}
