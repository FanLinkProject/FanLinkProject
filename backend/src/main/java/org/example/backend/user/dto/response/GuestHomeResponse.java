package org.example.backend.user.dto.response;

import java.util.List;

// 비로그인 유저 홈 화면 dto
public record GuestHomeResponse(
        LoginInfo loginInfo,
        List<ArtistCard> recommendedArtists,
        List<ArtistCard> newArtists
) {

    /**
     * 로그인 정보
     */
    public record LoginInfo(
            String loginUrl,           // 로그인 페이지 URL
            String signupUrl           // 회원가입 페이지 URL
    ) {
    }

    /**
     * 아티스트 카드
     */
    public record ArtistCard(
            Long id,
            String nickname,
            String profileImageUrl,
            Long followerCount         // 팔로워 수
    ) {
    }
}
