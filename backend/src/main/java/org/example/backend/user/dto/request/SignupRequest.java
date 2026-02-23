package org.example.backend.user.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record SignupRequest(
        @NotBlank(message = "이메일은 필수입니다.")
        @Email(
                regexp = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
                message = "올바른 이메일 형식이 아닙니다."
        )
        String email,

        @NotBlank(message = "닉네임은 필수입니다.")
        @Pattern(
                regexp = "^\\S{2,}$",
                message = "닉네임은 공백 없이 2자 이상이어야 합니다."
        )
        String nickname,

        @NotBlank(message = "이름은 필수입니다.")
        @Pattern(
                regexp = "^[a-zA-Z가-힣]{2,}$",
                message = "이름은 한글/영문 2자 이상이어야 합니다."
        )
        String name,

        @NotBlank(message = "비밀번호는 필수입니다.")
        String password,

        @NotBlank(message = "성별은 필수입니다.")
        String gender,

        @NotBlank(message = "생년월일은 필수입니다.")
        String birth,

        Boolean privacyPolicyAgreed,

        @NotBlank(message = "휴대폰 번호는 필수입니다.")
        String phoneNumber,

        // 하위호환: 기존 이메일 인증코드
        @Pattern(regexp = "^\\d{6}$", message = "이메일 인증코드는 6자리 숫자여야 합니다.")
        String emailVerificationCode,

        // 신규: 휴대폰 인증코드
        @Pattern(regexp = "^\\d{6}$", message = "휴대폰 인증코드는 6자리 숫자여야 합니다.")
        String phoneVerificationCode,

        // 기본 USER
        String role
) {
}
