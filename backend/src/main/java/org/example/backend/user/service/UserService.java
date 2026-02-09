package org.example.backend.user.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.BusinessException;
import org.example.backend.user.dto.request.BlockRequest;
import org.example.backend.user.dto.request.PasswordUpdateRequest;
import org.example.backend.user.dto.request.PhoneNumberUpdateRequest;
import org.example.backend.user.dto.request.UserProfileUpdateRequest;
import org.example.backend.user.dto.response.ArtistSearchResponse;
import org.example.backend.user.dto.response.BlockedResponse;
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
import org.example.backend.order.entity.Order;
import org.example.backend.order.repository.OrderRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {
    
    private final UserRepository userRepository;
    private final BlockRepository blockRepository;
    private final FollowRepository followRepository;
    private final OrderRepository orderRepository;
    private final VerificationCodeService verificationCodeService;
    private final PasswordEncoder passwordEncoder;

    // 전화번호 수정
    public void updatePhoneNumber(User user, PhoneNumberUpdateRequest request) {
        // 전화번호 인증 확인
        if (!verificationCodeService.verifyPhoneCode(request.phoneNumber(), request.verificationCode())) {
            throw new BusinessException(UserErrorCode.PHONE_VERIFICATION_FAILED);
        }

        // 전화번호 중복 확인 (다른 사용자가 사용 중인지 확인)
        if (!user.getPhoneNumber().equals(request.phoneNumber()) 
                && userRepository.existsByPhoneNumber(request.phoneNumber())) {
            throw new BusinessException(UserErrorCode.PHONE_NUMBER_ALREADY_EXISTS);
        }

        User currentUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));
        currentUser.setPhoneNumber(request.phoneNumber());
        userRepository.save(currentUser);
    }

    // 프로필 조회
    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(User user) {
        return UserProfileResponse.from(user);
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

        // 프로필 이미지 URL 업데이트
        if (request.profileImageUrl() != null) {
            currentUser.setProfileImageUrl(request.profileImageUrl());
        }

        User savedUser = userRepository.save(currentUser);
        return UserProfileResponse.from(savedUser);
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

    // 아티스트 목록 조회 및 검색
    @Transactional(readOnly = true)
    public Page<ArtistSearchResponse> getArtists(String nickname, Pageable pageable) {
        Page<User> artists;
        
        if (nickname != null && !nickname.trim().isEmpty()) {
            // 닉네임 또는 그룹명으로 검색
            artists = userRepository.findArtistsByNicknameOrGroupName(
                    UserRole.ARTIST,
                    UserStatus.ACTIVE,
                    nickname.trim(),
                    pageable
            );
        } else {
            // 전체 목록 조회
            artists = userRepository.findByRoleAndStatusAndDeletedAtIsNull(
                    UserRole.ARTIST,
                    UserStatus.ACTIVE,
                    pageable
            );
        }
        
        return artists.map(ArtistSearchResponse::from);
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

        // 3) 구매 내역 (페이징)
        Page<Order> ordersPage = orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable);
        var purchaseHistory = ordersPage.map(order -> new UserMyPageResponse.PurchaseHistory(
                order.getId(),
                order.getOrderNo(),
                order.getName(),
                order.getTotalAmount(),
                order.getTotalCandyAmount(),
                order.getStatus().name(),
                order.getCreatedAt().toString()
        )).getContent();

        // 4) 차단 목록 (페이징)
        Page<Block> blocks = blockRepository.findByBlocker(user, pageable);
        var blockedUsers = blocks.map(b -> new UserMyPageResponse.BlockedUser(
                b.getBlocked().getId(),
                b.getBlocked().getNickname(),
                b.getBlocked().getProfileImageUrl()
        )).getContent();

        return new UserMyPageResponse(
                profile,
                followedArtists,
                purchaseHistory,
                blockedUsers,
                follows.getTotalElements(),
                ordersPage.getTotalElements(),
                blocks.getTotalElements()
        );
    }
}
