package org.example.backend.user.dto.response;

import org.example.backend.user.entity.User;

public record SignupResponse(
        Long id,
        String email,
        String nickname,
        String name,
        String accessToken,
        String refreshToken
) {
    public static SignupResponse from(User user, String accessToken, String refreshToken) {
        return new SignupResponse(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getName(),
                accessToken,
                refreshToken
        );
    }
}
