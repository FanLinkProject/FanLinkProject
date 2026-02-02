package org.example.backend.user.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

// 이메일 인증 코드 발송 요청 dto
public record EmailVerificationRequest(
        @NotBlank(message = "이메일은 반드시 입력해야 합니다.")
        @Email(message = "올바른 이메일 형식이 아닙니다.")
        String email
) {
}
