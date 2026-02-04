package org.example.backend.user.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record SignupRequest(
        @NotBlank(message = "이메일은 반드시 입력해야 합니다.")
        @Email(
                regexp = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
                message = "올바른 이메일 형식이 아닙니다."
        )
        String email,

        @NotBlank(message = "닉네임은 반드시 입력해야 합니다.")
        @Pattern(
                regexp = "^\\S{2,}$",
                message = "공백없이 2자 이상 입력하세요."
        )
        String nickname,

        @NotBlank(message = "이름은 반드시 입력해야 합니다.")
        @Pattern(
                regexp = "^[a-zA-Z가-힣]{2,}$",
                message = "영어 또는 한글만 사용하여 2자 이상 입력하세요."
        )
        String name,

        @NotBlank(message = "비밀번호는 반드시 입력해야 합니다.")
        String password,

        @NotBlank(message = "성별을 선택하세요.")
        String gender,

        @NotBlank(message = "생년월일을 입력하세요.")
        String birth,

        Boolean privacyPolicyAgreed,

        @NotBlank(message = "전화번호를 입력하세요.")
        String phoneNumber,

        @NotBlank(message = "이메일 인증 코드는 반드시 입력해야 합니다.")
        @Pattern(regexp = "^\\d{6}$", message = "인증 코드는 6자리 숫자여야 합니다.")
        String emailVerificationCode,

        //기본값 USER
        String role
)
 {
}
