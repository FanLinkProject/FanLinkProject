package org.example.backend.user.dto.response;

import org.example.backend.user.entity.User;

// 아티스트 검색 dto (nickname=예명, name=실명)
public record ArtistSearchResponse(
        Long id,
        String nickname,
        String name,
        String profileImageUrl
) {
    public static ArtistSearchResponse from(User user) {
        return new ArtistSearchResponse(
                user.getId(),
                user.getNickname(),
                user.getName(),
                user.getProfileImageUrl()
        );
    }
}
