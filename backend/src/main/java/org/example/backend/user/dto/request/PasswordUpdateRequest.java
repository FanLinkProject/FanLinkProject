package org.example.backend.user.dto.request;

import jakarta.validation.constraints.NotBlank;

// 비밀번호 변경 dto
public record PasswordUpdateRequest(
        @NotBlank(message = "현재 비밀번호는 반드시 입력해야 합니다.")
        String currentPassword,  // 현재 비밀번호

        @NotBlank(message = "새 비밀번호는 반드시 입력해야 합니다.")
        String newPassword  // 새 비밀번호
) {
}
