package org.example.backend.user.dto.request;

import jakarta.validation.constraints.Pattern;

/**
 * OAuth 간편가입 후 부족한 추가 정보 입력용 DTO.
 * 모든 필드 선택(optional). 입력된 값만 DB에 반영.
 */
public record OAuthProfileCompleteRequest(
        String name,
        String gender,
        @Pattern(regexp = "^$|^\\d{4}-\\d{2}-\\d{2}$", message = "생년월일은 YYYY-MM-DD 형식이어야 합니다.")
        String birth,
        @Pattern(regexp = "^$|^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$", message = "올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)")
        String phoneNumber
) {
}
