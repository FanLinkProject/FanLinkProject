package org.example.backend.user.dto.response;

import java.math.BigDecimal;
import java.util.List;

/**
 * 유저 마이페이지 응답 DTO
 *
 * - 내 프로필 (닉네임, 프로필 사진)
 * - 팔로우 중인 아티스트
 * - 내가 쓴 글
 * - 내가 쓴 댓글
 * - 멤버십 상태
 * - 구매 내역
 * - 차단 목록
 */
public record UserMyPageResponse(
        UserProfileResponse profile,
        List<FollowedArtist> followedArtists,
        List<MyPost> myPosts,
        List<MyComment> myComments,
        List<MyLikedPost> myLikedPosts,
        List<MembershipStatus> memberships,
        List<PurchaseHistory> purchaseHistory,
        List<BlockedUser> blockedUsers,
        Long totalFollowingsCount,
        Long totalPostsCount,
        Long totalCommentsCount,
        Long totalLikedPostsCount,
        Long totalMembershipsCount,
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
     * deliveryId: 배송 추적 시 GET /api/deliveries/{deliveryId} 호출에 사용 (없으면 null)
     */
    public record PurchaseHistory(
            Long orderId,
            Long deliveryId,
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

    /**
     * 내가 쓴 글
     */
    public record MyPost(
            Long postId,
            String title,
            String content,
            String createdAt
    ) {
    }

    /**
     * 내가 좋아요 누른 게시글
     * - postType: FAN_POST / ARTIST_POST
     */
    public record MyLikedPost(
            Long postId,
            String postType,
            String title,
            String content,
            String postCreatedAt,
            String likedAt
    ) {
    }

    /**
     * 구독 중인 상품 (멤버십)
     * candyPrice: 캔디 가격 (null이면 현금 상품)
     * price: 현금 가격 원 (null이면 캔디 상품)
     * nextPaymentDate: 다음 갱신일 (ISO-8601 문자열, null 가능)
     */
    public record MembershipStatus(
            Long subscriptionId,
            String productName,
            Long candyPrice,
            Long price,
            Boolean isActive,
            String endDate,
            String nextPaymentDate
    ) {
    }

    /**
     * 내가 쓴 댓글
     */
    public record MyComment(
            Long commentId,
            String content,
            String targetType,  // POST, ARTIST_POST 등
            Long targetId,      // 게시글 ID
            String createdAt
    ) {
    }
}
