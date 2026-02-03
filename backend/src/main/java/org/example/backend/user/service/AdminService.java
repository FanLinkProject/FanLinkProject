package org.example.backend.user.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.security.jwt.JwtTokenProvider;
import org.example.backend.global.security.jwt.RefreshTokenStore;
import org.example.backend.user.dto.request.ArtistCreateRequest;
import org.example.backend.user.dto.request.PenaltyCreateRequest;
import org.example.backend.user.dto.response.AdminPenaltyResponse;
import org.example.backend.user.dto.response.ReportResponse;
import org.example.backend.user.dto.response.SignupResponse;
import org.example.backend.user.entity.Penalty;
import org.example.backend.user.entity.Report;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.enums.UserStatus;
import org.example.backend.user.exception.UserErrorCode;
import org.example.backend.user.repository.PenaltyRepository;
import org.example.backend.user.repository.ReportRepository;
import org.example.backend.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminService {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenStore refreshTokenStore;
    private final PenaltyRepository penaltyRepository;
    private final ReportRepository reportRepository;

    // 아티스트 계정 생성
    public SignupResponse createArtistAccount(ArtistCreateRequest request) {
        // 이메일 중복 확인
        if (userRepository.existsByEmail(request.email())) {
            throw new BusinessException(UserErrorCode.EMAIL_ALREADY_EXISTS);
        }
        // 닉네임 중복 확인
        if (userRepository.existsByNickname(request.nickname())) {
            throw new BusinessException(UserErrorCode.NICKNAME_ALREADY_EXISTS);
        }
        // 전화번호 중복 확인
        if (userRepository.existsByPhoneNumber(request.phoneNumber())) {
            throw new BusinessException(UserErrorCode.PHONE_NUMBER_ALREADY_EXISTS);
        }

        // User 엔티티 생성 (ARTIST 역할로 생성)
        User user = User.of(
                request.email(),
                request.nickname(),
                request.name(),
                passwordEncoder.encode(request.password()),
                request.gender(),
                request.birth(),
                request.phoneNumber(),
                request.privacyPolicyAgreed(),
                UserRole.ARTIST
        );

        User savedUser = userRepository.save(user);
        
        String accessToken = jwtTokenProvider.createAccessToken(savedUser.getEmail(), savedUser.getRole().getValue());
        String refreshToken = jwtTokenProvider.createRefreshToken(savedUser.getEmail(), savedUser.getRole().getValue());
        refreshTokenStore.save(savedUser.getEmail(), refreshToken);

        return SignupResponse.from(savedUser, accessToken, refreshToken);
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
}
