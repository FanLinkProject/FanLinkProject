package org.example.backend.user.dto.request;

import jakarta.validation.constraints.AssertTrue;
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
                regexp = "^[a-zA-Z가-힣\\s]{2,}$",
                message = "이름은 한글/영문 2자 이상이어야 합니다."
        )
        String name,

        @NotBlank(message = "비밀번호는 필수입니다.")
        String password,

        @NotBlank(message = "성별은 필수입니다.")
        String gender,

        @NotBlank(message = "생년월일은 필수입니다.")
        @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$", message = "생년월일은 YYYY-MM-DD 형식이어야 합니다.")
        String birth,

        @AssertTrue(message = "개인정보 수집 및 이용 동의는 필수입니다.")
        Boolean privacyPolicyAgreed,

        @NotBlank(message = "전화번호는 필수입니다.")
        @Pattern(regexp = "^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$", message = "올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)")
        String phoneNumber,

        // 하위호환: 기존 이메일 인증코드 (null/blank 시 미검증)
        @Pattern(regexp = "^$|^\\d{6}$", message = "이메일 인증코드는 6자리 숫자여야 합니다.")
        String emailVerificationCode,

        // 신규: 휴대폰 인증코드 (null/blank 시 미검증)
        @Pattern(regexp = "^$|^\\d{6}$", message = "휴대폰 인증코드는 6자리 숫자여야 합니다.")
        String phoneVerificationCode,

        // 기본 USER
        String role
) {
}
