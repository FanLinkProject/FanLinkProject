package org.example.backend.user.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.BusinessException;
import org.example.backend.user.dto.request.BlockRequest;
import org.example.backend.user.dto.request.OAuthProfileCompleteRequest;
import org.example.backend.user.dto.request.PasswordUpdateRequest;
import org.example.backend.user.dto.request.PhoneNumberUpdateRequest;
import org.example.backend.user.dto.request.UserProfileUpdateRequest;
import org.example.backend.chat.entity.ChatMessage;
import org.example.backend.chat.entity.ChatRoom;
import org.example.backend.chat.enums.MessageType;
import org.example.backend.chat.repository.ChatMessageRepository;
import org.example.backend.chat.repository.ChatRoomRepository;
import org.example.backend.notification.repository.NotificationRepository;
import org.example.backend.comment.entity.Comment;
import org.example.backend.comment.repository.CommentRepository;
import org.example.backend.like.entity.Like;
import org.example.backend.like.enums.LikeTarget;
import org.example.backend.like.repository.LikeRepository;
import org.example.backend.media_asset.service.MediaAssetService;
import org.example.backend.user.dto.response.ArtistSearchResponse;
import org.example.backend.user.dto.response.BlockedResponse;
import org.example.backend.user.dto.response.GuestHomeResponse;
import org.example.backend.user.dto.response.UserHomeResponse;
import org.example.backend.user.dto.response.UserMyPageResponse;
import org.example.backend.user.dto.response.UserProfileResponse;
import org.example.backend.user.entity.Follow;
import org.example.backend.user.entity.Block;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.enums.UserStatus;
import org.example.backend.user.exception.UserErrorCode;
import org.example.backend.user.repository.BlockRepository;
import org.example.backend.user.repository.FollowRepository;
import org.example.backend.user.repository.UserRepository;
import org.example.backend.user.repository.GroupMemberRepository;
import org.example.backend.order.entity.Order;
import org.example.backend.order.repository.OrderRepository;
import org.example.backend.product.enums.ProductType;
import org.example.backend.post.entity.ArtistPost;
import org.example.backend.post.entity.FanPost;
import org.example.backend.post.repository.ArtistPostRepository;
import org.example.backend.post.repository.FanPostRepository;
import org.example.backend.subscription.entity.Subscription;
import org.example.backend.subscription.repository.SubscriptionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {
    
    private final UserRepository userRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final BlockRepository blockRepository;
    private final FollowRepository followRepository;
    private final OrderRepository orderRepository;
    private final FanPostRepository fanPostRepository;
    private final ArtistPostRepository artistPostRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final VerificationCodeService verificationCodeService;
    private final PasswordEncoder passwordEncoder;
    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final NotificationRepository notificationRepository;
    private final CommentRepository commentRepository;
    private final LikeRepository likeRepository;
    private final MediaAssetService mediaAssetService;

    // 전화번호 수정
    public void updatePhoneNumber(User user, PhoneNumberUpdateRequest request) {
        String newPhone = normalizePhone(request.phoneNumber());

        // 전화번호 인증 확인
        if (!verificationCodeService.verifyPhoneCode(newPhone, request.verificationCode())) {
            throw new BusinessException(UserErrorCode.PHONE_VERIFICATION_FAILED);
        }

        String currentPhone = normalizePhone(user.getPhoneNumber());

        // 전화번호 중복 확인 (다른 사용자가 사용 중인지 확인)
        if (!currentPhone.equals(newPhone)
                && userRepository.existsByPhoneNumber(newPhone)) {
            throw new BusinessException(UserErrorCode.PHONE_NUMBER_ALREADY_EXISTS);
        }

        User currentUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));
        currentUser.setPhoneNumber(newPhone);
        userRepository.save(currentUser);
    }

    // 프로필 조회
    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(User user) {
        Long groupId = null;
        if (user.getRole() == UserRole.GROUP) {
            // GROUP 계정: 자신이 곧 그룹
            groupId = user.getId();
        } else if (user.getRole() == UserRole.ARTIST) {
            // ARTIST 계정: 소속 그룹 ID 조회
            groupId = groupMemberRepository.findByMember(user)
                    .map(gm -> gm.getGroup().getId())
                    .orElse(null);
        }
        return UserProfileResponse.from(user, groupId);
    }

    // 프로필 수정
    public UserProfileResponse updateProfile(User user, UserProfileUpdateRequest request) {
        User currentUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

        // 닉네임 변경 시 중복 확인
        if (request.nickname() != null && !request.nickname().equals(currentUser.getNickname())) {
            if (userRepository.existsByNickname(request.nickname())) {
                throw new BusinessException(UserErrorCode.NICKNAME_ALREADY_EXISTS);
            }
            currentUser.setNickname(request.nickname());
        }

        // 프로필 이미지: MediaAsset ID가 있으면 CDN URL로 반영, 없으면 기존 profileImageUrl 처리
        if (request.profileImageMediaAssetId() != null) {
            String profileUrl = mediaAssetService.getPublicUrlForProfileImage(
                    request.profileImageMediaAssetId(), currentUser.getId());
            currentUser.setProfileImageUrl(profileUrl);
        } else if (request.profileImageUrl() != null) {
            currentUser.setProfileImageUrl(request.profileImageUrl());
        }

        User savedUser = userRepository.save(currentUser);
        return UserProfileResponse.from(savedUser);
    }

    /** OAuth 간편가입 후 부족한 추가 정보(name, gender, birth, phoneNumber) 저장 */
    public UserProfileResponse updateOAuthProfileComplete(User user, OAuthProfileCompleteRequest request) {
        User currentUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

        String nameVal = request.name() != null ? request.name().trim() : null;
        String genderVal = request.gender() != null ? request.gender().trim() : null;
        String birthVal = request.birth() != null ? request.birth().trim() : null;
        String phoneVal = request.phoneNumber() != null ? request.phoneNumber().trim() : null;

        if (nameVal != null && !nameVal.isBlank()) {
            currentUser.setName(nameVal);
        }
        if (genderVal != null && !genderVal.isBlank()) {
            currentUser.setGender(genderVal);
        }
        if (birthVal != null && !birthVal.isBlank()) {
            currentUser.setBirth(birthVal);
        }

        if (phoneVal != null && !phoneVal.isBlank()) {
            String newPhone = normalizePhone(phoneVal);
            String currentPhone = currentUser.getPhoneNumber();
            boolean isPlaceholder = currentPhone == null || currentPhone.isBlank()
                    || (currentPhone != null && (currentPhone.startsWith("kakao_") || currentPhone.startsWith("google_")
                    || currentPhone.startsWith("naver_") || currentPhone.startsWith("instagram_")));
            String normalizedCurrentPhone = isPlaceholder ? "" : normalizePhone(currentPhone);
            if (isPlaceholder || !normalizedCurrentPhone.equals(newPhone)) {
                if (userRepository.existsByPhoneNumber(newPhone)) {
                    throw new BusinessException(UserErrorCode.PHONE_NUMBER_ALREADY_EXISTS);
                }
                if (!verificationCodeService.consumePhoneVerified(newPhone)) {
                    throw new BusinessException(UserErrorCode.PHONE_VERIFICATION_FAILED);
                }
                currentUser.setPhoneNumber(newPhone);
            }
        }

        User saved = userRepository.save(currentUser);
        return getProfile(saved);
    }

    // 비밀번호 변경
    public void updatePassword(User user, PasswordUpdateRequest request) {
        User currentUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

        // 현재 비밀번호 검증
        if (!passwordEncoder.matches(request.currentPassword(), currentUser.getPassword())) {
            throw new BusinessException(UserErrorCode.PASSWORD_MISMATCH);
        }

        // 새 비밀번호 암호화 후 저장
        currentUser.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(currentUser);
    }

    // 공연 등록용 아티스트 검색: ARTIST만 (그룹 계정 제외). 개인 아티스트 + 그룹 소속 멤버 아티스트만 노출
    @Transactional(readOnly = true)
    public Page<ArtistSearchResponse> getArtistsForConcert(String nickname, Pageable pageable) {
        String keyword = (nickname != null && !nickname.trim().isEmpty()) ? nickname.trim() : null;
        Page<User> list = userRepository.findArtistsOnlyForConcertSearch(
                UserRole.ARTIST, UserStatus.ACTIVE, keyword, pageable);
        var responses = list.getContent().stream().map(ArtistSearchResponse::from).toList();
        return new org.springframework.data.domain.PageImpl<>(responses, pageable, list.getTotalElements());
    }

    // 아티스트 목록 조회: GROUP 계정 + GroupMember에 속하지 않은 개인 ARTIST만 노출
    @Transactional(readOnly = true)
    public Page<ArtistSearchResponse> getArtists(String nickname, Pageable pageable) {
        if (nickname != null && !nickname.trim().isEmpty()) {
            Page<User> artists = userRepository.findArtistsByNicknameOrGroupName(
                    UserRole.ARTIST, UserStatus.ACTIVE, nickname.trim(), Pageable.unpaged());
            Page<User> groups = userRepository.findArtistsByNicknameOrGroupName(
                    UserRole.GROUP, UserStatus.ACTIVE, nickname.trim(), Pageable.unpaged());
            var artistNotInGroup = artists.getContent().stream()
                    .filter(user -> groupMemberRepository.findByMember(user).isEmpty())
                    .toList();
            var merged = java.util.stream.Stream.concat(artistNotInGroup.stream(), groups.getContent().stream())
                    .sorted(java.util.Comparator.comparing(User::getNickname, String.CASE_INSENSITIVE_ORDER))
                    .toList();
            long total = merged.size();
            int start = (int) pageable.getOffset();
            int end = Math.min(start + pageable.getPageSize(), merged.size());
            var pageContent = start >= merged.size() ? java.util.List.<User>of() : merged.subList(start, end);
            var responses = pageContent.stream().map(ArtistSearchResponse::from).toList();
            return new org.springframework.data.domain.PageImpl<>(responses, pageable, total);
        }
        Page<User> listable = userRepository.findListableArtists(
                java.util.List.of(UserRole.ARTIST, UserRole.GROUP),
                UserStatus.ACTIVE,
                UserRole.GROUP,
                pageable
        );
        var responses = listable.getContent().stream().map(ArtistSearchResponse::from).toList();
        return new org.springframework.data.domain.PageImpl<>(responses, pageable, listable.getTotalElements());
    }

    // 유저 차단
    public void blockUser(User blocker, BlockRequest request) {
        // 자기 자신을 차단할 수 없음
        if (blocker.getId().equals(request.userId())) {
            throw new BusinessException(UserErrorCode.USER_ACCESS_DENIED);
        }

        // 차단할 유저 조회
        User blocked = userRepository.findById(request.userId())
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

        // 이미 차단한 유저인지 확인
        if (blockRepository.existsByBlockerAndBlocked(blocker, blocked)) {
            throw new BusinessException(UserErrorCode.USER_ACCESS_DENIED);
        }

        // 차단 관계 생성
        Block block = new Block();
        block.setBlocker(blocker);
        block.setBlocked(blocked);
        blockRepository.save(block);
    }

    // 유저 차단 해제
    public void unblockUser(User blocker, Long blockedUserId) {
        // 차단할 유저 조회
        User blocked = userRepository.findById(blockedUserId)
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

        // 차단 관계 조회
        Block block = blockRepository.findByBlockerAndBlocked(blocker, blocked)
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

        // 차단 관계 삭제
        blockRepository.delete(block);
    }

    // 차단 유저 목록 조회
    @Transactional(readOnly = true)
    public Page<BlockedResponse> getBlockedUsers(User blocker, Pageable pageable) {
        Page<Block> blocks = blockRepository.findByBlocker(blocker, pageable);
        return blocks.map(BlockedResponse::from);
    }

    // 아티스트 팔로우
    public void followArtist(User follower, Long artistId) {
        if (follower.getId().equals(artistId)) {
            throw new BusinessException(UserErrorCode.FOLLOW_SELF_NOT_ALLOWED);
        }

        User artist = userRepository.findById(artistId)
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

        // 팔로우 대상이 아티스트 또는 그룹인지 검증
        if (artist.getRole() != UserRole.ARTIST && artist.getRole() != UserRole.GROUP) {
            throw new BusinessException(UserErrorCode.FOLLOW_TARGET_NOT_ARTIST);
        }

        // 이미 팔로우 중인지 확인
        if (followRepository.existsByFollowerAndArtist(follower, artist)) {
            throw new BusinessException(UserErrorCode.FOLLOW_ALREADY_EXISTS);
        }

        try {
            Follow follow = Follow.of(follower, artist);
            followRepository.save(follow);
        } catch (Exception e) {
            // 데이터베이스 제약 조건 위반 등 예외 처리
            throw new BusinessException(UserErrorCode.FOLLOW_ALREADY_EXISTS);
        }
    }

    // 아티스트 팔로우 취소
    public void unfollowArtist(User follower, Long artistId) {
        User artist = userRepository.findById(artistId)
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

        Follow follow = followRepository.findByFollowerAndArtist(follower, artist)
                .orElseThrow(() -> new BusinessException(UserErrorCode.FOLLOW_NOT_FOUND));

        followRepository.delete(follow);
    }

    // 내가 팔로우한 아티스트 목록 (페이징)
    @Transactional(readOnly = true)
    public Page<ArtistSearchResponse> getMyFollowings(User follower, Pageable pageable) {
        Page<Follow> follows = followRepository.findByFollower(follower, pageable);
        return follows.map(f -> ArtistSearchResponse.from(f.getArtist()));
    }

    // 팔로워 수 조회 (아티스트)
    @Transactional(readOnly = true)
    public long getMyFollowerCount(User artist) {
        // 아티스트 또는 그룹만 허용
        if (artist.getRole() != UserRole.ARTIST && artist.getRole() != UserRole.GROUP) {
            throw new BusinessException(UserErrorCode.FOLLOW_TARGET_NOT_ARTIST);
        }
        return followRepository.countByArtist(artist);
    }

    // 유저 마이페이지 조회
    @Transactional(readOnly = true)
    public UserMyPageResponse getMyPage(User user, Pageable pageable) {
        // 1) 내 프로필
        UserProfileResponse profile = UserProfileResponse.from(user);

        // 2) 팔로우 중인 아티스트 목록 (페이징)
        Page<Follow> follows = followRepository.findByFollower(user, pageable);
        var followedArtists = follows.map(f -> new UserMyPageResponse.FollowedArtist(
                f.getArtist().getId(),
                f.getArtist().getNickname(),
                f.getArtist().getProfileImageUrl()
        )).getContent();

        // 3) 내가 쓴 글 (페이징)
        Page<FanPost> postsPage = fanPostRepository.findByUserAndStatusOrderByCreatedAtDesc(
                user, false, pageable);
        var myPosts = postsPage.map(post -> new UserMyPageResponse.MyPost(
                post.getId(),
                post.getTitle(),
                post.getContent() != null && post.getContent().length() > 100
                        ? post.getContent().substring(0, 100) + "..."
                        : post.getContent(),
                post.getCreatedAt().toString()
        )).getContent();

        // 4) 내가 쓴 댓글 (페이징)
        Page<Comment> commentsPage = commentRepository.findMyComments(user.getId(), pageable);
        var myComments = commentsPage.map(comment -> new UserMyPageResponse.MyComment(
                comment.getId(),
                comment.getContent() != null && comment.getContent().length() > 100
                        ? comment.getContent().substring(0, 100) + "..."
                        : comment.getContent(),
                comment.getTargetType().name(),
                comment.getTargetId(),
                comment.getCreatedAt().toString()
        )).getContent();

        // 4-1) 내가 좋아요 누른 게시글 (페이징)
        Page<Like> likesPage = likeRepository.findByUserIdAndTargetTypeInOrderByCreatedAtDesc(
                user.getId(),
                List.of(LikeTarget.FAN_POST, LikeTarget.ARTIST_POST),
                pageable
        );

        List<Like> likes = likesPage.getContent();
        List<Long> likedFanPostIds = likes.stream()
                .filter(l -> l.getTargetType() == LikeTarget.FAN_POST)
                .map(Like::getTargetId)
                .distinct()
                .toList();
        List<Long> likedArtistPostIds = likes.stream()
                .filter(l -> l.getTargetType() == LikeTarget.ARTIST_POST)
                .map(Like::getTargetId)
                .distinct()
                .toList();

        Map<Long, FanPost> fanPostMap = fanPostRepository.findAllById(likedFanPostIds).stream()
                .collect(Collectors.toMap(FanPost::getId, Function.identity(), (a, b) -> a));
        Map<Long, ArtistPost> artistPostMap = artistPostRepository.findAllById(likedArtistPostIds).stream()
                .collect(Collectors.toMap(ArtistPost::getId, Function.identity(), (a, b) -> a));

        var myLikedPosts = likes.stream()
                .map(like -> {
                    if (like.getTargetType() == LikeTarget.FAN_POST) {
                        FanPost post = fanPostMap.get(like.getTargetId());
                        if (post == null || Boolean.TRUE.equals(post.getStatus())) {
                            return null;
                        }
                        String content = post.getContent();
                        if (content != null && content.length() > 100) {
                            content = content.substring(0, 100) + "...";
                        }
                        return new UserMyPageResponse.MyLikedPost(
                                post.getId(),
                                LikeTarget.FAN_POST.name(),
                                post.getTitle(),
                                content,
                                post.getCreatedAt().toString(),
                                like.getCreatedAt().toString()
                        );
                    }

                    if (like.getTargetType() == LikeTarget.ARTIST_POST) {
                        ArtistPost post = artistPostMap.get(like.getTargetId());
                        if (post == null || Boolean.TRUE.equals(post.getStatus())) {
                            return null;
                        }
                        String content = post.getContent();
                        if (content != null && content.length() > 100) {
                            content = content.substring(0, 100) + "...";
                        }
                        return new UserMyPageResponse.MyLikedPost(
                                post.getId(),
                                LikeTarget.ARTIST_POST.name(),
                                post.getTitle(),
                                content,
                                post.getCreatedAt().toString(),
                                like.getCreatedAt().toString()
                        );
                    }

                    return null;
                })
                .filter(v -> v != null)
                .toList();

        // 5) 구독 중인 상품 (활성 구독만)
        List<Subscription> activeSubscriptions = subscriptionRepository
                .findByUserIdAndIsActive(user.getId(), true);
        var memberships = activeSubscriptions.stream()
                .map(sub -> {
                    var product = sub.getProduct();
                    String nextPaymentStr = sub.getNextPaymentDate() != null
                            ? sub.getNextPaymentDate().toString()
                            : null;
                    return new UserMyPageResponse.MembershipStatus(
                            sub.getId(),
                            product.getName(),
                            product.getCandyPrice(),
                            product.getPrice(),
                            sub.getIsActive(),
                            sub.getEndDate().toString(),
                            nextPaymentStr
                    );
                })
                .toList();

        // 6) 구매 내역 (페이징) - SETTLEMENT_CANDY만 포함된 주문 제외
        Page<Order> ordersPage = orderRepository.findByUserIdOrderByCreatedAtDescExcludingSettlementCandyOnly(
                user.getId(), ProductType.SETTLEMENT_CANDY, pageable);
        var purchaseHistory = ordersPage.map(order -> new UserMyPageResponse.PurchaseHistory(
                order.getId(),
                order.getDelivery() != null ? order.getDelivery().getId() : null,
                order.getOrderNo(),
                order.getName(),
                order.getTotalAmount(),
                order.getTotalCandyAmount(),
                order.getStatus().name(),
                order.getCreatedAt().toString()
        )).getContent();

        // 7) 차단 목록 (페이징)
        Page<Block> blocks = blockRepository.findByBlocker(user, pageable);
        var blockedUsers = blocks.map(b -> new UserMyPageResponse.BlockedUser(
                b.getBlocked().getId(),
                b.getBlocked().getNickname(),
                b.getBlocked().getProfileImageUrl()
        )).getContent();

        return new UserMyPageResponse(
                profile,
                followedArtists,
                myPosts,
                myComments,
                myLikedPosts,
                memberships,
                purchaseHistory,
                blockedUsers,
                follows.getTotalElements(),
                postsPage.getTotalElements(),
                commentsPage.getTotalElements(),
                likesPage.getTotalElements(),
                (long) activeSubscriptions.size(),
                ordersPage.getTotalElements(),
                blocks.getTotalElements()
        );
    }

    // 비로그인 유저 메인 홈 화면 조회
    @Transactional(readOnly = true)
    public GuestHomeResponse getGuestHome() {
        // 1) 로그인 정보
        GuestHomeResponse.LoginInfo loginInfo = new GuestHomeResponse.LoginInfo(
                "/api/auth/login",
                "/api/auth/signup"
        );

        // 2) 추천 아티스트 (랜덤, 넉넉히 조회 후 5명 표시용) — 그룹에 속한 개인 아티스트 제외
        Pageable recommendedPageable = PageRequest.of(0, 30);
        List<User> recommendedArtists = userRepository.findRecommendedArtists(
                UserRole.ARTIST.name(),
                UserRole.GROUP.name(),
                UserStatus.ACTIVE.name(),
                recommendedPageable
        ).getContent().stream()
                .filter(u -> u.getRole() == UserRole.GROUP || groupMemberRepository.findByMember(u).isEmpty())
                .toList();

        List<GuestHomeResponse.ArtistCard> recommendedCards = recommendedArtists.stream()
                .map(artist -> {
                    long followerCount = followRepository.countByArtist(artist);
                    return new GuestHomeResponse.ArtistCard(
                            artist.getId(),
                            artist.getNickname(),
                            artist.getProfileImageUrl(),
                            followerCount
                    );
                })
                .toList();

        // 3) 새로운 아티스트 (최근 가입한 순서, 최대 10개) — 그룹에 속한 개인 아티스트 제외
        Pageable newArtistsPageable = PageRequest.of(0, 10);
        List<User> newArtists = userRepository.findByRoleAndStatusAndDeletedAtIsNullOrderByCreatedAtDesc(
                UserRole.ARTIST,
                UserStatus.ACTIVE,
                newArtistsPageable
        ).getContent().stream()
                .filter(u -> groupMemberRepository.findByMember(u).isEmpty())
                .toList();

        List<User> newGroups = userRepository.findByRoleAndStatusAndDeletedAtIsNullOrderByCreatedAtDesc(
                UserRole.GROUP,
                UserStatus.ACTIVE,
                newArtistsPageable
        ).getContent();

        List<User> allNewArtists = new java.util.ArrayList<>();
        allNewArtists.addAll(newArtists);
        allNewArtists.addAll(newGroups);
        allNewArtists.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        allNewArtists = allNewArtists.stream().limit(10).toList();

        List<GuestHomeResponse.ArtistCard> newArtistsCards = allNewArtists.stream()
                .map(artist -> {
                    long followerCount = followRepository.countByArtist(artist);
                    return new GuestHomeResponse.ArtistCard(
                            artist.getId(),
                            artist.getNickname(),
                            artist.getProfileImageUrl(),
                            followerCount
                    );
                })
                .toList();

        return new GuestHomeResponse(
                loginInfo,
                recommendedCards,
                newArtistsCards
        );
    }

    // 로그인 유저 메인 홈 화면 조회
    @Transactional(readOnly = true)
    public UserHomeResponse getUserHome(User user) {
        List<Follow> follows = followRepository.findByFollower(user, PageRequest.of(0, 10))
                .getContent();

        List<UserHomeResponse.FollowedArtist> followedArtists = follows.stream()
                .map(f -> new UserHomeResponse.FollowedArtist(
                        f.getArtist().getId(),
                        f.getArtist().getNickname(),
                        f.getArtist().getProfileImageUrl()
                ))
                .collect(Collectors.toList());

        List<UserHomeResponse.DmNotification> dmNotifications = follows.stream()
                .map(Follow::getArtist)
                .flatMap(this::getArtistLastMessage)
                .limit(5)
                .collect(Collectors.toList());

        List<UserHomeResponse.NotificationItem> notifications = notificationRepository
                .findByReceiver_IdOrderByCreatedAtDesc(user.getId())
                .stream()
                .limit(10)
                .map(n -> new UserHomeResponse.NotificationItem(
                        n.getId(),
                        n.getType().name(),
                        n.getContent(),
                        n.getCreatedAt().toString(),
                        n.isRead()
                ))
                .collect(Collectors.toList());

        return new UserHomeResponse(followedArtists, dmNotifications, notifications);
    }

    private java.util.stream.Stream<UserHomeResponse.DmNotification> getArtistLastMessage(User artist) {
        ChatRoom chatRoom = chatRoomRepository.findByOwner(artist).orElse(null);
        if (chatRoom == null) {
            return java.util.stream.Stream.empty();
        }

        List<ChatMessage> artistMessages = chatMessageRepository.findTop50ByChatRoomOrderByIdDesc(chatRoom)
                .stream()
                .filter(m -> m.getMessageType() == MessageType.ARTIST)
                .limit(1)
                .collect(Collectors.toList());

        if (artistMessages.isEmpty()) {
            return java.util.stream.Stream.empty();
        }

        ChatMessage lastMessage = artistMessages.get(0);
        String content = lastMessage.getContent();
        String truncatedContent = content.length() > 50 ? content.substring(0, 50) + "..." : content;

        return java.util.stream.Stream.of(new UserHomeResponse.DmNotification(
                chatRoom.getId(),
                artist.getId(),
                artist.getNickname(),
                artist.getProfileImageUrl(),
                truncatedContent,
                lastMessage.getCreatedAt().toString(),
                false
        ));
    }

    private String normalizePhone(String phoneNumber) {
        return phoneNumber == null ? "" : phoneNumber.replaceAll("[^0-9]", "");
    }
}
