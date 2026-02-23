package org.example.backend.user.dto.request;

import jakarta.validation.constraints.NotBlank;

public record SignoutRequest(
        @NotBlank(message = "비밀번호는 필수입니다.")
        String password
) {
}
