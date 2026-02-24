package org.example.backend.replay.dto;

import jakarta.validation.constraints.NotNull;
import org.example.backend.replay.entity.ReplayAccessType;

/**
 * 다시보기 수동 업로드 슬롯 생성 요청.
 * 라이브 녹화가 없을 때(직접 녹화본 업로드, 행사/TV 영상 등) 사용.
 */
public record ReplayCreateManualRequest(
        @NotNull
        Long artistId,
        @NotNull
        ReplayAccessType accessType,
        @jakarta.validation.constraints.Size(max = 200)
        String title
) {
}
