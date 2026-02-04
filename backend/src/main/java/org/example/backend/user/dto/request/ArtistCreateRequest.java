package org.example.backend.user.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

// 아티스트 계정 생성 dto
public record ArtistCreateRequest(
        @NotBlank(message = "이메일은 반드시 입력해야 합니다.")
        @Email(
                regexp = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
                message = "올바른 이메일 형식이 아닙니다."
        )
        String email,

        @NotBlank(message = "닉네임(예명)은 반드시 입력해야 합니다.")
        @Pattern(
                regexp = "^\\S{2,}$",
                message = "공백없이 2자 이상 입력하세요."
        )
        String nickname,

        @NotBlank(message = "이름은 반드시 입력해야 합니다.")
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

        // 그룹 계정 여부 (true: 그룹 계정, false: 개인 아티스트 계정)
        Boolean isGroup,

        // 그룹 ID (개인 아티스트 계정 생성 시 그룹에 소속시키려는 경우 지정, null 가능)
        Long groupId
) {
}
