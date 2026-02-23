package org.example.backend.user.dto.response;

/**
 * 아티스트 그룹 목록 카드용 DTO (팬 홈 /artists 페이지)
 * 사용: UserController GET /api/user/artists/list, UserService.getArtistGroupsWithStats
 */
public record ArtistGroupCardResponse(
        Long id,
        String nickname,
        String name,
        String profileImageUrl,
        long followerCount,
        long postCount
) {
}
