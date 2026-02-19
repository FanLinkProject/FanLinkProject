package org.example.backend.user.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.BusinessException;
import org.example.backend.notification.entity.Notification;
import org.example.backend.notification.entity.NotificationType;
import org.example.backend.notification.repository.NotificationRepository;
import org.example.backend.post.entity.ArtistPost;
import org.example.backend.post.repository.ArtistPostRepository;
import org.example.backend.product.entity.Product;
import org.example.backend.product.repository.ProductRepository;
import org.example.backend.subscription.entity.Subscription;
import org.example.backend.subscription.repository.SubscriptionRepository;
import org.example.backend.user.dto.response.ArtistDashboardResponse;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.exception.UserErrorCode;
import org.example.backend.user.repository.FollowRepository;
import org.example.backend.user.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ArtistDashboardService {

    private final UserRepository userRepository;
    private final FollowRepository followRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final ArtistPostRepository artistPostRepository;
    private final NotificationRepository notificationRepository;
    private final ProductRepository productRepository;

    // 특정 아티스트 대시보드 조회
    public ArtistDashboardResponse getArtistDashboard(User viewer, Long artistId) {
        User artist = userRepository.findById(artistId)
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

        if (artist.getRole() != UserRole.ARTIST && artist.getRole() != UserRole.GROUP) {
            throw new BusinessException(UserErrorCode.FOLLOW_TARGET_NOT_ARTIST);
        }

        // 1) 아티스트 기본 정보
        ArtistDashboardResponse.ArtistInfo artistInfo = new ArtistDashboardResponse.ArtistInfo(
                artist.getId(),
                artist.getNickname(),
                artist.getProfileImageUrl(),
                artist.getBannerImageUrl(),
                artist.getBio()
        );

        // 2) 팔로우 상태
        boolean isFollowing = false;
        if (viewer != null) {
            isFollowing = followRepository.existsByFollowerAndArtist(viewer, artist);
        }
        ArtistDashboardResponse.FollowStatus followStatus = new ArtistDashboardResponse.FollowStatus(
                isFollowing,
                isFollowing ? "팔로우 취소" : "팔로우"
        );

        // 3) 멤버십 정보 (팬 유저만 대상, 아티스트/관리자는 멤버십 가입 안 함)
        boolean canSubscribeMembership = viewer != null && viewer.getRole() == UserRole.USER;
        boolean hasActiveMembership = false;
        if (canSubscribeMembership) {
            List<Subscription> activeSubscriptions = subscriptionRepository
                    .findByUserIdAndIsActive(viewer.getId(), true);
            hasActiveMembership = activeSubscriptions.stream()
                    .anyMatch(sub -> sub.getProduct().getArtistId() != null 
                            && sub.getProduct().getArtistId().equals(artistId));
        }

        String membershipButtonText = null;
        String membershipButtonUrl = null;
        if (canSubscribeMembership) {
            membershipButtonText = hasActiveMembership ? "멤버십 관리" : "멤버십 가입";
            membershipButtonUrl = hasActiveMembership ? "/api/subscriptions/my" : "/api/subscriptions/subscribe";
        }

        ArtistDashboardResponse.MembershipInfo membershipInfo = new ArtistDashboardResponse.MembershipInfo(
                hasActiveMembership,
                membershipButtonText,
                membershipButtonUrl
        );

        // 4) 게시글 목록 (최대 20개)
        List<ArtistPost> posts = artistPostRepository
                .findByUserAndStatusOrderByCreatedAtDesc(artist, false, PageRequest.of(0, 20))
                .getContent();

        final boolean finalHasActiveMembership = hasActiveMembership;
        final boolean finalIsFollowing = isFollowing;

        List<ArtistDashboardResponse.PostItem> postItems = posts.stream()
                .map(post -> {
                    boolean isMembershipOnly = post.getIsMembershipOnly();
                    boolean isVisible = !isMembershipOnly || finalHasActiveMembership || finalIsFollowing;
                    String visibilityMessage = null;
                    if (isMembershipOnly && !finalHasActiveMembership && !finalIsFollowing) {
                        visibilityMessage = "전체 콘텐츠는 멤버에게만 공개됩니다";
                    }

                    String content = post.getContent();
                    if (!isVisible && content != null) {
                        content = content.length() > 100 ? content.substring(0, 100) + "..." : content;
                    }

                    return new ArtistDashboardResponse.PostItem(
                            post.getId(),
                            post.getTitle(),
                            content,
                            post.getCreatedAt().toString(),
                            isMembershipOnly,
                            isVisible,
                            visibilityMessage
                    );
                })
                .collect(Collectors.toList());

        // 5) 라이브 알림 (LIVE_STARTED 타입, 최대 5개)
        List<Notification> liveNotifications = viewer != null
                ? notificationRepository.findByReceiver_IdOrderByCreatedAtDesc(viewer.getId())
                        .stream()
                        .filter(n -> n.getType() == NotificationType.LIVE_STARTED 
                                && n.getSender() != null 
                                && n.getSender().getId().equals(artistId))
                        .limit(5)
                        .collect(Collectors.toList())
                : List.of();

        List<ArtistDashboardResponse.LiveNotification> liveNotificationItems = liveNotifications.stream()
                .map(n -> new ArtistDashboardResponse.LiveNotification(
                        n.getId(),
                        n.getContent(),
                        n.getCreatedAt().toString(),
                        n.isRead()
                ))
                .collect(Collectors.toList());

        // 6) 샵 아이템 (해당 아티스트의 상품, 최대 20개)
        List<Product> products = productRepository.findAll()
                .stream()
                .filter(p -> p.getArtistId() != null && p.getArtistId().equals(artistId))
                .limit(20)
                .collect(Collectors.toList());

        List<ArtistDashboardResponse.ShopItem> shopItems = products.stream()
                .map(p -> new ArtistDashboardResponse.ShopItem(
                        p.getId(),
                        p.getName(),
                        p.getPrice() != null ? BigDecimal.valueOf(p.getPrice()) : null,
                        p.getCandyPrice() != null ? BigDecimal.valueOf(p.getCandyPrice()) : null,
                        p.getType().name(),
                        p.getIsMembershipOnly(),
                        p.getIsExclusive()
                ))
                .collect(Collectors.toList());

        return new ArtistDashboardResponse(
                artistInfo,
                followStatus,
                membershipInfo,
                postItems,
                liveNotificationItems,
                shopItems
        );
    }
}
