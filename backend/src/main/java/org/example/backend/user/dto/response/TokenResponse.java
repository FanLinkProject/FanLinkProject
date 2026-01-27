package org.example.backend.user.dto.response;

public record TokenResponse(
        String accessToken,
        String refreshToken
) {
    public static TokenResponse from(String accessToken, String refreshToken) {
        return new TokenResponse(accessToken, refreshToken);
    }
}
