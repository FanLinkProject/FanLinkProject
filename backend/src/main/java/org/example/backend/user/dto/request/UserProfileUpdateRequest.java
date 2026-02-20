package org.example.backend.user.dto.request;

import jakarta.validation.constraints.Pattern;

// 프로필 수정 dto
public record UserProfileUpdateRequest(
        @Pattern(
                regexp = "^\\S{2,}$",
                message = "공백없이 2자 이상 입력하세요."
        )
        String nickname,  // 닉네임

        String profileImageUrl,  // 프로필 이미지 URL (외부 URL 직접 지정 시)

        Long profileImageMediaAssetId  // 프로필 이미지로 사용할 MediaAsset ID (presign 업로드 후 사용, 우선)
) {
}
