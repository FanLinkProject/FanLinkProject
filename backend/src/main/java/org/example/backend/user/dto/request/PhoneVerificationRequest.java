package org.example.backend.user.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

// 전화번호 인증번호 발송 요청 dto
public record PhoneVerificationRequest(
        @NotBlank(message = "전화번호는 반드시 입력해야 합니다.")
        @Pattern(regexp = "^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$", message = "올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)")
        String phoneNumber
) {
}
