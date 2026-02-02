package org.example.backend.user.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

// 전화번호 수정 dto
public record PhoneNumberUpdateRequest(
        @NotBlank(message = "전화번호는 반드시 입력해야 합니다.")
        @Pattern(regexp = "^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$", message = "올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)")
        String phoneNumber,

        @NotBlank(message = "인증번호는 반드시 입력해야 합니다.")
        @Pattern(regexp = "^\\d{6}$", message = "인증번호는 6자리 숫자여야 합니다.")
        String verificationCode
) {
}
