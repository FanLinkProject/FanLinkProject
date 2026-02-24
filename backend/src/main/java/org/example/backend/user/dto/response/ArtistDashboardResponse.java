package org.example.backend.user.dto.response;

import java.math.BigDecimal;
import java.util.List;

// 특정 아티스트 대시보드 응답 DTO
public record ArtistDashboardResponse(
        ArtistInfo artistInfo,
        FollowStatus followStatus,
        MembershipInfo membershipInfo,
        boolean isGroupMember,
        boolean isGroup,
        List<MemberItem> members,
        List<PostItem> posts,
        List<LiveNotification> liveNotifications,
        List<ShopItem> shopItems
) {

    // 아티스트 기본 정보
    public record ArtistInfo(
            Long artistId,
            String nickname,
            String profileImageUrl,
            String bannerImageUrl,
            String bio,
            long followerCount,
            int postCount
    ) {
    }

    // 팔로우 상태
    public record FollowStatus(
            boolean isFollowing,
            String followButtonText,  // "팔로우" 또는 "팔로우 취소"
            boolean isFollowingGroup  // 소속 멤버인 경우: 그룹 팔로우 여부 (구매 가능 판단용)
    ) {
    }

    // 멤버십 정보
    public record MembershipInfo(
            boolean hasActiveMembership,
            String membershipButtonText,  // "멤버십 가입" 또는 "멤버십 관리"
            String membershipButtonUrl
    ) {
    }

    // 소속 멤버 (그룹/팀 멤버 목록, DM 상품 연결용)
    public record MemberItem(
            Long memberId,
            String nickname,
            String profileImageUrl,
            Long dmProductId  // 아티스트 DM 상품 ID, 없으면 null
    ) {
    }

    // 게시글 아이템
    public record PostItem(
            Long postId,
            String title,
            String content,
            String createdAt,
            boolean isMembershipOnly,
            boolean isVisible,  // 현재 유저가 볼 수 있는지 여부
            String visibilityMessage  // "전체 콘텐츠는 멤버에게만 공개됩니다" 등
    ) {
    }

    // 라이브 알림
    public record LiveNotification(
            Long notificationId,
            String content,
            String createdAt,
            boolean isRead
    ) {
    }

    // 샵 아이템
    public record ShopItem(
            Long productId,
            String name,
            BigDecimal price,
            BigDecimal candyPrice,
            String productType,
            boolean isMembershipOnly,
            boolean isExclusive
    ) {
    }
}
