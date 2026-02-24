package org.example.backend.user.dto.request;

/**
 * 회원탈퇴 요청.
 * - 일반 계정: password 필수.
 * - 소셜 계정(OAuth): password 없이 탈퇴 가능 (null 또는 빈 문자열).
 */
public record SignoutRequest(
        String password
) {
}
