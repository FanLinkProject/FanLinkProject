package org.example.backend.user.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.example.backend.user.enums.PenaltyType;

// 패널티 부여 dto
public record PenaltyCreateRequest(
        @NotNull(message = "대상 사용자 ID는 반드시 입력해야 합니다.")
        Long userId,

        @NotNull(message = "패널티 타입은 반드시 입력해야 합니다.")
        PenaltyType penaltyType,

        @NotBlank(message = "패널티 사유는 반드시 입력해야 합니다.")
        String reason
) {
}

