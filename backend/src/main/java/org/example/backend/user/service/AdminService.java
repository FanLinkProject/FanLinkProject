package org.example.backend.user.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.security.jwt.JwtTokenProvider;
import org.example.backend.global.security.jwt.RefreshTokenStore;
import org.example.backend.user.dto.request.ArtistCreateRequest;
import org.example.backend.user.dto.request.PenaltyCreateRequest;
import org.example.backend.user.dto.response.AdminArtistRowResponse;
import org.example.backend.user.dto.response.AdminHomeResponse;
import org.example.backend.user.dto.response.AdminPenaltyResponse;
import org.example.backend.user.dto.response.AdminUserRowResponse;
import org.example.backend.user.dto.response.ReportResponse;
import org.example.backend.user.dto.response.SignupResponse;
import org.example.backend.user.entity.GroupMember;
import org.example.backend.user.entity.Penalty;
import org.example.backend.user.entity.Report;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.enums.UserStatus;
import org.example.backend.user.exception.UserErrorCode;
import org.example.backend.user.repository.GroupMemberRepository;
import org.example.backend.user.repository.PenaltyRepository;
import org.example.backend.user.repository.ReportRepository;
import org.example.backend.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.LocalDateTime;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class AdminService {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenStore refreshTokenStore;
    private final PenaltyRepository penaltyRepository;
    private final ReportRepository reportRepository;
    private final GroupMemberRepository groupMemberRepository;

    // 아티스트 계정 생성
    public SignupResponse createArtistAccount(ArtistCreateRequest request) {
        String normalizedPhone = normalizePhone(request.phoneNumber());

        // 이메일 중복 확인
        if (userRepository.existsByEmail(request.email())) {
            throw new BusinessException(UserErrorCode.EMAIL_ALREADY_EXISTS);
        }
        // 닉네임 중복 확인
        if (userRepository.existsByNickname(request.nickname())) {
            throw new BusinessException(UserErrorCode.NICKNAME_ALREADY_EXISTS);
        }
        // 전화번호 중복 확인
        if (userRepository.existsByPhoneNumber(normalizedPhone)) {
            throw new BusinessException(UserErrorCode.PHONE_NUMBER_ALREADY_EXISTS);
        }

        // 그룹 계정 여부에 따라 역할 결정
        UserRole role = (request.isGroup() != null && request.isGroup()) 
                ? UserRole.GROUP 
                : UserRole.ARTIST;

        // role 별 name 검증
        // - GROUP: 한글/영문/숫자 허용 (2자 이상)
        // - ARTIST: 한글/영문만 허용 (2자 이상)
        String name = request.name();
        if (role == UserRole.GROUP) {
            if (name == null || !name.matches("^[a-zA-Z가-힣0-9]{2,}$")) {
                throw new BusinessException(UserErrorCode.INVALID_NAME_FORMAT);
            }
        } else {
            if (name == null || !name.matches("^[a-zA-Z가-힣]{2,}$")) {
                throw new BusinessException(UserErrorCode.INVALID_NAME_FORMAT);
            }
        }

        // 개인 아티스트 계정 생성 시 그룹 지정 검증
        if (role == UserRole.ARTIST && request.groupId() != null) {
            // 그룹 유저 조회
            User groupUser = userRepository.findById(request.groupId())
                    .orElseThrow(() -> new BusinessException(UserErrorCode.GROUP_NOT_FOUND));
            
            // 그룹 역할인지 확인
            if (groupUser.getRole() != UserRole.GROUP) {
                throw new BusinessException(UserErrorCode.INVALID_GROUP_ROLE);
            }
        }

        // User 엔티티 생성
        User user = User.of(
                request.email(),
                request.nickname(),
                request.name(),
                passwordEncoder.encode(request.password()),
                request.gender(),
                request.birth(),
                normalizedPhone,
                request.privacyPolicyAgreed(),
                role
        );
        if (request.channelArn() != null && !request.channelArn().isBlank()) {
            user.setChannelArn(request.channelArn());
        }

        User savedUser = userRepository.save(user);

        // 개인 아티스트 계정이고 그룹이 지정된 경우 GroupMember 생성
        if (role == UserRole.ARTIST && request.groupId() != null) {
            User groupUser = userRepository.findById(request.groupId())
                    .orElseThrow(() -> new BusinessException(UserErrorCode.GROUP_NOT_FOUND));
            
            // 이미 다른 그룹에 속해있는지 확인
            if (groupMemberRepository.findByMember(savedUser).isPresent()) {
                throw new BusinessException(UserErrorCode.ARTIST_ALREADY_IN_GROUP);
            }

            // GroupMember 엔티티 생성
            GroupMember groupMember = new GroupMember();
            groupMember.setGroup(groupUser);
            groupMember.setMember(savedUser);
            groupMember.setGroupName(groupUser.getNickname()); // 그룹명은 그룹 유저의 닉네임 사용
            groupMemberRepository.save(groupMember);
        }
        
        String accessToken = jwtTokenProvider.createAccessToken(savedUser.getEmail(), savedUser.getRole().getValue());
        String refreshToken = jwtTokenProvider.createRefreshToken(savedUser.getEmail(), savedUser.getRole().getValue());
        try {
            refreshTokenStore.save(savedUser.getEmail(), refreshToken);
        } catch (Exception e) {
            // Redis unavailable should not break account creation itself.
            // Token refresh may be unavailable until Redis recovers.
            log.warn("Artist account creation succeeded, but failed to store refresh token in Redis: {}", e.getMessage());
        }

        return SignupResponse.from(savedUser, accessToken, refreshToken);
    }

    private String normalizePhone(String phoneNumber) {
        return phoneNumber == null ? "" : phoneNumber.replaceAll("[^0-9]", "");
    }

    // 패널티 부여
    public AdminPenaltyResponse givePenalty(User admin, PenaltyCreateRequest request) {
        User targetUser = userRepository.findById(request.userId())
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime endedAt = null;

        switch (request.penaltyType()) {
            case RESTRICT -> endedAt = now.plusDays(7);
            case WEEKEND_BAN -> {
                endedAt = now.plusDays(7);
                targetUser.setStatus(UserStatus.SUSPENDED);
            }
            case PERMANENT_BAN -> targetUser.setStatus(UserStatus.BANNED);
        }

        Penalty penalty = new Penalty();
        penalty.setAdmin(admin);
        penalty.setUser(targetUser);
        penalty.setPenaltyType(request.penaltyType());
        penalty.setReason(request.reason());
        penalty.setStartedAt(now);
        penalty.setEndedAt(endedAt);

        Penalty saved = penaltyRepository.save(penalty);
        userRepository.save(targetUser);

        return AdminPenaltyResponse.from(saved);
    }

    // 신고 내역 조회
    @Transactional(readOnly = true)
    public Page<ReportResponse> getAllReports(Pageable pageable) {
        Page<Report> reports = reportRepository.findAll(pageable);
        return reports.map(ReportResponse::from);
    }

    // 패널티 내역 조회
    @Transactional(readOnly = true)
    public Page<AdminPenaltyResponse> getMyGivenPenalties(User admin, Pageable pageable) {
        Page<Penalty> penalties = penaltyRepository.findByAdminId(admin.getId(), pageable);
        return penalties.map(AdminPenaltyResponse::from);
    }

    // 관리자 메인 홈 화면 데이터 조회
    @Transactional(readOnly = true)
    public AdminHomeResponse getHome() {
        // 1) 유저 통계
        long totalUsers = userRepository.countByDeletedAtIsNull();
        long newUsersToday = userRepository.countNewUsersToday();
        long dau = userRepository.countDau();
        // MAU: 최근 30일간 가입한 유저 수
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        long mau = userRepository.countMau(thirtyDaysAgo);

        AdminHomeResponse.UserStatistics userStats = new AdminHomeResponse.UserStatistics(
                totalUsers,
                newUsersToday,
                dau,
                mau
        );

        // 2) 아티스트 통계
        long totalArtists = userRepository.countByRoleAndDeletedAtIsNull(UserRole.ARTIST);
        long totalGroups = userRepository.countByRoleAndDeletedAtIsNull(UserRole.GROUP);

        AdminHomeResponse.ArtistStatistics artistStats = new AdminHomeResponse.ArtistStatistics(
                totalArtists,
                totalGroups
        );

        // 3) 신고 통계
        long pendingReports = reportRepository.countByStatusFalse();
        long completedReports = reportRepository.countByStatusTrue();

        AdminHomeResponse.ReportStatistics reportStats = new AdminHomeResponse.ReportStatistics(
                pendingReports,
                completedReports
        );

        return new AdminHomeResponse(userStats, artistStats, reportStats);
    }

    /** 관리자: 회원 목록 (페이징, 선택 검색) */
    @Transactional(readOnly = true)
    public Page<AdminUserRowResponse> getUsers(String keyword, Pageable pageable) {
        UserRole targetRole = UserRole.USER;
        Page<User> users;
        if (keyword != null && !keyword.trim().isEmpty()) {
            users = userRepository.findForAdminUserSearchByRole(targetRole, keyword.trim(), pageable);
        } else {
            users = userRepository.findByRoleAndDeletedAtIsNullOrderByCreatedAtDesc(targetRole, pageable);
        }
        return users.map(AdminUserRowResponse::from);
    }

    /** 관리자: 아티스트/그룹 목록 (페이징, 선택 검색) */
    @Transactional(readOnly = true)
    public Page<AdminArtistRowResponse> getArtists(String keyword, Pageable pageable) {
        List<UserRole> roles = List.of(UserRole.ARTIST, UserRole.GROUP);
        Page<User> artists;
        if (keyword != null && !keyword.trim().isEmpty()) {
            artists = userRepository.findForAdminArtistSearch(roles, keyword.trim(), pageable);
        } else {
            artists = userRepository.findByRoleInAndDeletedAtIsNullOrderByCreatedAtDesc(roles, pageable);
        }
        return artists.map(AdminArtistRowResponse::from);
    }
}
