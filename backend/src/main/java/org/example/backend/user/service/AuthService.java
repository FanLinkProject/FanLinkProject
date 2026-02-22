package org.example.backend.user.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.security.jwt.JwtTokenProvider;
import org.example.backend.global.security.jwt.RefreshTokenStore;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.user.dto.request.LoginRequest;
import org.example.backend.user.dto.request.SignupRequest;
import org.example.backend.user.dto.response.SignupResponse;
import org.example.backend.user.dto.response.TokenResponse;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.enums.UserStatus;
import org.example.backend.user.exception.UserErrorCode;
import org.example.backend.user.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class AuthService {
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenStore refreshTokenStore;
    private final VerificationCodeService verificationCodeService;

    // 회원가입
    public SignupResponse signup(SignupRequest request) {
        try {
            // 이메일 인증 확인
            boolean isEmailVerified = verificationCodeService.verifyEmailCode(
                    request.email(),
                    request.emailVerificationCode()
            );
            if (!isEmailVerified) {
                throw new BusinessException(UserErrorCode.EMAIL_VERIFICATION_FAILED);
            }

            // 이메일 중복 확인
            if (userRepository.existsByEmail(request.email())) {
                throw new BusinessException(UserErrorCode.EMAIL_ALREADY_EXISTS);
            }

            // 닉네임 중복 확인
            if (userRepository.existsByNickname(request.nickname())) {
                throw new BusinessException(UserErrorCode.NICKNAME_ALREADY_EXISTS);
            }

            // [수정] 역할 결정 로직
            // 프론트에서 "ARTIST"라고 보내면 아티스트 권한 부여, 그 외에는 무조건 USER (ADMIN 가입 방지)
            UserRole userRole = UserRole.USER;
            if (request.role() != null && request.role().equalsIgnoreCase("ARTIST")) {
                userRole = UserRole.ARTIST;
            }

            // 전화번호 중복 확인
            if (userRepository.existsByPhoneNumber(request.phoneNumber())) {
                throw new BusinessException(UserErrorCode.PHONE_NUMBER_ALREADY_EXISTS);
            }

            // User 엔티티 생성(정적 팩토리 메서드 활용)
            User user = User.of(
                    request.email(),
                    request.nickname(),
                    request.name(),
                    passwordEncoder.encode(request.password()),
                    request.gender(),
                    request.birth(),
                    request.phoneNumber(),
                    request.privacyPolicyAgreed(),
                    userRole
            );

            // User 저장
            User savedUser = userRepository.save(user);

            // JWT 토큰 생성
            String accessToken = jwtTokenProvider.createAccessToken(savedUser.getEmail(), savedUser.getRole().getValue());
            String refreshToken = jwtTokenProvider.createRefreshToken(savedUser.getEmail(), savedUser.getRole().getValue());

            // Redis-RefreshToken 저장
            refreshTokenStore.save(savedUser.getEmail(), refreshToken);

            return SignupResponse.from(savedUser, accessToken, refreshToken);
        } catch (BusinessException e) {
            // BusinessException은 그대로 전달
            throw e;
        } catch (Exception e) {
            // 예상치 못한 예외는 로그에 기록하고 재발생
            System.err.println("[ERROR] 회원가입 중 예외 발생: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("회원가입 중 오류가 발생했습니다: " + e.getMessage(), e);
        }
    }

    // 로그인
    @Transactional(readOnly = true)
    public TokenResponse login(LoginRequest request) {
        // 이메일로 사용자 조회
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다: " + request.email()));

        // 비밀번호 검증
        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new BusinessException(UserErrorCode.PASSWORD_MISMATCH);
        }

        // 계정 상태 확인
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException(UserErrorCode.ACCOUNT_INACTIVE);
        }

        // JWT 토큰 생성
        String accessToken = jwtTokenProvider.createAccessToken(user.getEmail(), user.getRole().getValue());
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getEmail(), user.getRole().getValue());

        // Redis-RefreshToken 저장 (실패해도 로그인은 성공시키고, 리프레시만 제한됨)
        try {
            refreshTokenStore.save(user.getEmail(), refreshToken);
        } catch (Exception e) {
            log.warn("로그인 성공했으나 RefreshToken Redis 저장 실패 (Redis 점검 필요): {}", e.getMessage());
        }

        return TokenResponse.builder()
                .grantType("bearer")
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .accessTokenExpiresIn(3600000L)
                .role(user.getRole().name())
                .build();
    }

    // Access Token 갱신 (Refresh Token 검증 후 새 Access Token 발급)
    @Transactional(readOnly = true)
    public TokenResponse refresh(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new BusinessException(UserErrorCode.INVALID_TOKEN);
        }
        String email = jwtTokenProvider.getUserEmail(refreshToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException(UserErrorCode.ACCOUNT_INACTIVE);
        }
        // Redis에 저장된 refresh token과 일치하는지 확인 (로그아웃 후 재사용 방지)
        String stored = refreshTokenStore.get(email);
        if (stored == null || !stored.equals(refreshToken)) {
            throw new BusinessException(UserErrorCode.INVALID_TOKEN);
        }
        String newAccessToken = jwtTokenProvider.createAccessToken(user.getEmail(), user.getRole().getValue());
        return TokenResponse.builder()
                .grantType("bearer")
                .accessToken(newAccessToken)
                .refreshToken(refreshToken)
                .accessTokenExpiresIn(3600000L)
                .role(user.getRole().name())
                .build();
    }

    // 로그아웃
    public void logout(String refreshToken) {
        // RefreshToken 유효성 검증
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new BusinessException(UserErrorCode.INVALID_TOKEN);
        }

        String email = jwtTokenProvider.getUserEmail(refreshToken);

        // Redis에서 삭제
        refreshTokenStore.delete(email);
        SecurityContextHolder.clearContext();
    }

    // 회원 탈퇴
    public void signout(Long userId) {
        // 사용자 정보
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !(authentication.getPrincipal() instanceof PrincipalDetails)) {
            throw new BusinessException(UserErrorCode.UNAUTHENTICATED);
        }

        PrincipalDetails principalDetails = (PrincipalDetails) authentication.getPrincipal();
        User user = principalDetails.getUser();

        // 이미 탈퇴한 사용자인지 확인
        User currentUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));
        if (currentUser.getDeletedAt() != null) {
            throw new BusinessException(UserErrorCode.ACCOUNT_ALREADY_DELETED);
        }

        // 회원 탈퇴 처리(소프트삭제)
        currentUser.delete();
        //Redis 토큰 삭제
        refreshTokenStore.delete(user.getEmail());

        SecurityContextHolder.clearContext();
    }
}