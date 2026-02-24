package org.example.backend.user.dto.response;

import org.example.backend.user.entity.User;

// 프로필 조회 dto
public record UserProfileResponse(
        Long id,
        String email,
        String nickname,
        String name,
        String profileImageUrl,
        String gender,
        String birth,
        Long candy,
        // GROUP 계정: 자신의 ID / ARTIST 계정(그룹 소속): 소속 그룹의 ID / 기타: null
        Long groupId,
        // OAuth 간편가입 후 추가 정보 미입력 시 true (추가정보 입력 페이지로 유도용)
        Boolean needsProfileComplete,
        // 로그인 수단: "LOCAL" | "kakao" | "google" | "naver" | "instagram" 등 (소셜 탈퇴 시 비밀번호 없이 탈퇴 가능 여부 판단용)
        String provider
) {
    private static boolean computeNeedsProfileComplete(User user) {
        if (user.getProvider() == null || "LOCAL".equals(user.getProvider())) {
            return false;
        }
        String phone = user.getPhoneNumber();
        String birth = user.getBirth();
        return (phone == null || phone.isBlank()
                || phone.startsWith("kakao_")
                || phone.startsWith("google_")
                || phone.startsWith("naver_")
                || phone.startsWith("instagram_"))
                || (birth == null || birth.isBlank() || "1900-01-01".equals(birth));
    }

    private static String normalizeProvider(User user) {
        if (user.getProvider() == null || user.getProvider().isBlank()) {
            return "LOCAL";
        }
        return user.getProvider();
    }

    public static UserProfileResponse from(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getName(),
                user.getProfileImageUrl(),
                user.getGender(),
                user.getBirth(),
                user.getCandy(),
                null,
                computeNeedsProfileComplete(user),
                normalizeProvider(user)
        );
    }

    public static UserProfileResponse from(User user, Long groupId) {
        return new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getName(),
                user.getProfileImageUrl(),
                user.getGender(),
                user.getBirth(),
                user.getCandy(),
                groupId,
                computeNeedsProfileComplete(user),
                normalizeProvider(user)
        );
    }
}
