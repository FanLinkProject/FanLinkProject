package org.example.backend.user.dto.response;

import java.math.BigDecimal;
import java.util.List;

/**
 * 유저 마이페이지 응답 DTO
 *
 * - 내 프로필 (닉네임, 프로필 사진)
 * - 팔로우 중인 아티스트
 * - 구매 내역
 * - 차단 목록
 */
public record UserMyPageResponse(
        UserProfileResponse profile,
        List<FollowedArtist> followedArtists,
        List<PurchaseHistory> purchaseHistory,
        List<BlockedUser> blockedUsers,
        Long totalFollowingsCount,
        Long totalOrdersCount,
        Long totalBlockedUsersCount
) {

    /**
     * 팔로우 중인 아티스트
     */
    public record FollowedArtist(
            Long artistId,
            String nickname,
            String profileImageUrl
    ) {
    }

    /**
     * 구매 내역
     */
    public record PurchaseHistory(
            Long orderId,
            String orderNo,
            String orderName,
            BigDecimal totalAmount,
            Long totalCandyAmount,
            String status,
            String createdAt
    ) {
    }

    /**
     * 차단한 유저
     */
    public record BlockedUser(
            Long userId,
            String nickname,
            String profileImageUrl
    ) {
    }
}
