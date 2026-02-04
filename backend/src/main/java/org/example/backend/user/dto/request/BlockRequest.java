package org.example.backend.user.dto.request;

import jakarta.validation.constraints.NotNull;

// 유저 차단 dto
public record BlockRequest(
        @NotNull(message = "차단할 유저 ID는 반드시 입력해야 합니다.")
        Long userId
) {
}
