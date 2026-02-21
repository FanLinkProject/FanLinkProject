package org.example.backend.user.dto.response;

import org.example.backend.user.entity.User;

import java.time.LocalDateTime;

/** 관리자 아티스트 목록 한 행 */
public record AdminArtistRowResponse(
        Long id,
        String nickname,
        String email,
        String profileImageUrl,
        String role,
        LocalDateTime createdAt
) {
    public static AdminArtistRowResponse from(User user) {
        return new AdminArtistRowResponse(
                user.getId(),
                user.getNickname(),
                user.getEmail(),
                user.getProfileImageUrl(),
                user.getRole() != null ? user.getRole().name() : "ARTIST",
                user.getCreatedAt()
        );
    }
}
