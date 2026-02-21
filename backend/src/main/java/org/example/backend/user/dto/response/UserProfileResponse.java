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
        Long groupId
) {
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
                null
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
                groupId
        );
    }
}
