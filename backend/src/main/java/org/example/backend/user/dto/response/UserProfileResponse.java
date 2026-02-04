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
        Long candy
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
                user.getCandy()
        );
    }
}
