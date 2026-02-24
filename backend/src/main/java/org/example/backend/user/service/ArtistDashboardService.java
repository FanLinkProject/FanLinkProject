package org.example.backend.user.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.BusinessException;
import org.example.backend.notification.entity.Notification;
import org.example.backend.notification.entity.NotificationType;
import org.example.backend.notification.repository.NotificationRepository;
import org.example.backend.post.entity.ArtistPost;
import org.example.backend.post.repository.ArtistPostRepository;
import org.example.backend.product.entity.Product;
import org.example.backend.product.enums.ProductPaymentMethod;
import org.example.backend.product.repository.ProductRepository;
import org.example.backend.order.enums.OrderStatus;
import org.example.backend.order.repository.OrderRepository;
import org.example.backend.user.dto.response.ArtistDashboardResponse;
import org.example.backend.user.entity.GroupMember;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.exception.UserErrorCode;
import org.example.backend.user.repository.FollowRepository;
import org.example.backend.user.repository.GroupMemberRepository;
import org.example.backend.user.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ArtistDashboardService {

    private final UserRepository userRepository;
    private final FollowRepository followRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final OrderRepository orderRepository;
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

        // 1) 아티스트 기본 정보 (팔로워 수·포스트 수는 해당 아티스트/그룹 기준)
        long followerCount = followRepository.countByArtist(artist);
        int postCount = artist.getRole() == UserRole.GROUP
                ? (int) artistPostRepository.countByGroupId(artist.getId())
                : (int) artistPostRepository.countByUserAndStatus(artist, false);
        ArtistDashboardResponse.ArtistInfo artistInfo = new ArtistDashboardResponse.ArtistInfo(
                artist.getId(),
                artist.getNickname(),
                artist.getProfileImageUrl(),
                artist.getBannerImageUrl(),
                artist.getBio(),
                followerCount,
                postCount
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

        // 3) 그룹 소속 여부 (GROUP 계정 자신이거나, 해당 그룹의 소속 ARTIST인 경우)
        boolean isGroupMember = false;
        if (viewer != null) {
            if (viewer.getId().equals(artistId)) {
                // GROUP 계정이 자신의 페이지를 볼 때
                isGroupMember = true;
            } else if (viewer.getRole() == UserRole.ARTIST) {
                // ARTIST 계정이 자신이 속한 그룹 페이지를 볼 때
                isGroupMember = groupMemberRepository.existsByGroupAndMember(artist, viewer);
            }
        }

        // 5) 멤버십 정보 (팬 유저만 대상, 아티스트/관리자는 멤버십 가입 안 함)
        // 멤버십 상품 일회 구매(12개월 내) 시에만 멤버십 인정
        boolean canSubscribeMembership = viewer != null && viewer.getRole() == UserRole.USER;
        boolean hasActiveMembership = false;
        if (canSubscribeMembership) {
            hasActiveMembership = orderRepository.existsPaidMembershipOrder(
                    viewer.getId(),
                    artistId,
                    OrderStatus.COMPLETED,
                    java.time.Instant.now().atZone(ZoneId.systemDefault()).minusMonths(12).toInstant());
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

        // 5-1) 소속 멤버 목록 (그룹인 경우 또는 개인 아티스트가 소속 그룹이 있는 경우)
        List<ArtistDashboardResponse.MemberItem> memberItems = resolveMemberItems(artist);

        // 6) 게시글 목록 (최대 20개)
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

        // 7) 라이브 알림 (LIVE_STARTED 타입, 최대 5개)
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

        // 8) 샵 아이템 (해당 아티스트의 상품, 최대 20개)
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

        boolean isGroup = artist.getRole() == UserRole.GROUP;
        return new ArtistDashboardResponse(
                artistInfo,
                followStatus,
                membershipInfo,
                isGroupMember,
                isGroup,
                memberItems,
                postItems,
                liveNotificationItems,
                shopItems
        );
    }

    private List<ArtistDashboardResponse.MemberItem> resolveMemberItems(User artist) {
        if (artist.getRole() != UserRole.ARTIST && artist.getRole() != UserRole.GROUP) {
            return List.of();
        }
        User groupUser;
        List<GroupMember> members;
        if (artist.getRole() == UserRole.GROUP) {
            groupUser = artist;
            members = groupMemberRepository.findByGroup(artist);
        } else {
            var membership = groupMemberRepository.findByMember(artist).orElse(null);
            if (membership == null || membership.getGroup() == null) {
                return List.of();
            }
            groupUser = membership.getGroup();
            members = groupMemberRepository.findByGroup(groupUser);
        }
        Long groupUserId = groupUser.getId();
        return members.stream()
                .filter(gm -> !gm.getMember().getId().equals(groupUserId))
                .map(gm -> {
                    var member = gm.getMember();
                    Long dmProductId = null;
                    List<Product> dmProducts = productRepository.findByArtistIdAndPaymentMethod(
                            member.getId(), ProductPaymentMethod.CANDY_ONLY);
                    if (!dmProducts.isEmpty()) {
                        dmProductId = dmProducts.get(0).getId();
                    }
                    return new ArtistDashboardResponse.MemberItem(
                            member.getId(),
                            member.getNickname(),
                            member.getProfileImageUrl(),
                            dmProductId
                    );
                })
                .collect(Collectors.toList());
    }
}
