package org.example.backend.user.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.global.security.jwt.JwtTokenProvider;
import org.example.backend.global.security.jwt.RefreshTokenStore;
import org.example.backend.global.security.oauth2.OAuthAuthorizationCodeStore;
import org.example.backend.user.dto.request.LoginRequest;
import org.example.backend.user.dto.request.PasswordResetRequest;
import org.example.backend.user.dto.request.SignoutRequest;
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

import java.time.Duration;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class AuthService {
    private static final int LOGIN_ATTEMPT_LIMIT = 5;
    private static final Duration LOGIN_ATTEMPT_WINDOW = Duration.ofMinutes(15);

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenStore refreshTokenStore;
    private final VerificationCodeService verificationCodeService;
    private final OAuthAuthorizationCodeStore oauthAuthorizationCodeStore;
    private final RateLimitService rateLimitService;
    private final EmailService emailService;

    public SignupResponse signup(SignupRequest request) {
        try {
            verifySignupCode(request);
            String normalizedPhone = normalizePhone(request.phoneNumber());

            if (userRepository.existsByEmail(request.email())) {
                throw new BusinessException(UserErrorCode.EMAIL_ALREADY_EXISTS);
            }
            if (userRepository.existsByNickname(request.nickname())) {
                throw new BusinessException(UserErrorCode.NICKNAME_ALREADY_EXISTS);
            }
            if (userRepository.existsByPhoneNumber(normalizedPhone)) {
                throw new BusinessException(UserErrorCode.PHONE_NUMBER_ALREADY_EXISTS);
            }

            User user = User.of(
                    request.email(),
                    request.nickname(),
                    request.name(),
                    passwordEncoder.encode(request.password()),
                    request.gender(),
                    request.birth(),
                    normalizedPhone,
                    request.privacyPolicyAgreed(),
                    UserRole.USER
            );

            User savedUser = userRepository.save(user);

            String accessToken = jwtTokenProvider.createAccessToken(
                    savedUser.getEmail(), savedUser.getRole().getValue());
            String refreshToken = jwtTokenProvider.createRefreshToken(
                    savedUser.getEmail(), savedUser.getRole().getValue());

            try {
                refreshTokenStore.save(savedUser.getEmail(), refreshToken);
            } catch (Exception e) {
                // Redis unavailable should not break signup itself.
                log.warn("Signup succeeded, but failed to store refresh token in Redis: {}", e.getMessage());
            }

            return SignupResponse.from(savedUser, accessToken, refreshToken);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("Unexpected exception during signup", e);
            throw new RuntimeException("Failed to process signup: " + e.getMessage(), e);
        }
    }

    private void verifySignupCode(SignupRequest request) {
        String phone = normalizePhone(request.phoneNumber());
        // In the current signup flow, prefer phone verification when provided.
        if (!isBlank(request.phoneVerificationCode())) {
            String normalizedPhone = normalizePhone(request.phoneNumber());
            boolean ok = verificationCodeService.verifyPhoneCode(
                normalizedPhone,
                        request.phoneVerificationCode()
            );
            if (!ok) {
                ok = verificationCodeService.consumePhoneVerified(normalizedPhone);
                ok = verificationCodeService.consumePhoneVerified(phone);
            }
            if (!ok) {
                throw new BusinessException(UserErrorCode.PHONE_VERIFICATION_FAILED);
            }
            return;
        }

        // Fallback to email verification.
        if (!isBlank(request.emailVerificationCode())) {
            boolean ok = verificationCodeService.verifyEmailCode(
                    request.email(),
                    request.emailVerificationCode()
            );
            if (!ok) {
                throw new BusinessException(UserErrorCode.EMAIL_VERIFICATION_FAILED);
            }
            return;
        }

        throw new BusinessException(UserErrorCode.PHONE_VERIFICATION_FAILED);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String normalizePhone(String phoneNumber) {
        return phoneNumber == null ? "" : phoneNumber.replaceAll("[^0-9]", "");
    }

    @Transactional(readOnly = true)
    public TokenResponse login(LoginRequest request) {
        String normalizedEmail = request.email() == null ? "" : request.email().trim().toLowerCase();
        String loginRateLimitKey = "auth:login:" + normalizedEmail;
        if (!rateLimitService.tryAcquire(loginRateLimitKey, LOGIN_ATTEMPT_LIMIT, LOGIN_ATTEMPT_WINDOW)) {
            throw new BusinessException(UserErrorCode.LOGIN_ATTEMPTS_EXCEEDED);
        }

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + request.email()));

        String encodedPassword = user.getPassword();
        if (encodedPassword == null || encodedPassword.isBlank()
                || !passwordEncoder.matches(request.password(), encodedPassword)) {
            throw new BusinessException(UserErrorCode.PASSWORD_MISMATCH);
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException(UserErrorCode.ACCOUNT_INACTIVE);
        }

        rateLimitService.clear(loginRateLimitKey);
        return issueTokenResponse(user);
    }

    public TokenResponse exchangeOAuthCode(String code) {
        OAuthAuthorizationCodeStore.OAuthCodePayload payload = oauthAuthorizationCodeStore.consume(code);
        if (payload == null) {
            throw new BusinessException(UserErrorCode.INVALID_TOKEN);
        }

        User user = userRepository.findByEmail(payload.email())
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException(UserErrorCode.ACCOUNT_INACTIVE);
        }

        return issueTokenResponse(user);
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
        if (isBlank(refreshToken) || !jwtTokenProvider.validateToken(refreshToken)) {
            throw new BusinessException(UserErrorCode.INVALID_TOKEN);
        }

        String email = jwtTokenProvider.getUserEmail(refreshToken);
        String storedRefreshToken = refreshTokenStore.get(email);
        if (storedRefreshToken == null || !storedRefreshToken.equals(refreshToken)) {
            throw new BusinessException(UserErrorCode.INVALID_TOKEN);
        }

        refreshTokenStore.delete(email);
        SecurityContextHolder.clearContext();
    }

    private static final int PASSWORD_RESET_SEND_LIMIT = 5;
    private static final Duration PASSWORD_RESET_SEND_WINDOW = Duration.ofHours(1);

    /** 비밀번호 찾기: 이메일로 인증 코드 발송 (회원 존재 시에만) */
    public void passwordResetSend(String email) {
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase();
        if (normalizedEmail.isBlank()) {
            throw new BusinessException(UserErrorCode.USER_EMAIL_NOT_FOUND);
        }
        if (!rateLimitService.tryAcquire("auth:password-reset:send:" + normalizedEmail,
                PASSWORD_RESET_SEND_LIMIT, PASSWORD_RESET_SEND_WINDOW)) {
            throw new BusinessException(UserErrorCode.TOO_MANY_REQUESTS);
        }
        if (!userRepository.existsByEmail(normalizedEmail)) {
            throw new BusinessException(UserErrorCode.USER_EMAIL_NOT_FOUND);
        }
        User user = userRepository.findByEmail(normalizedEmail).orElseThrow();
        if (user.getDeletedAt() != null) {
            throw new BusinessException(UserErrorCode.USER_EMAIL_NOT_FOUND);
        }
        String code = verificationCodeService.generateCode();
        verificationCodeService.saveEmailCode(normalizedEmail, code);
        emailService.sendVerificationCode(normalizedEmail, code);
    }

    /** 비밀번호 찾기: 인증 코드 검증만 (소비하지 않음) */
    public void passwordResetVerify(String email, String code) {
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase();
        if (normalizedEmail.isBlank()) {
            throw new BusinessException(UserErrorCode.USER_EMAIL_NOT_FOUND);
        }
        boolean isValid = verificationCodeService.validateEmailCodeWithoutConsume(normalizedEmail, code);
        if (!isValid) {
            throw new BusinessException(UserErrorCode.VERIFICATION_CODE_MISMATCH);
        }
    }

    /** 비밀번호 찾기: 인증 코드 검증 후 비밀번호 변경 */
    public void passwordReset(PasswordResetRequest request) {
        String normalizedEmail = request.email() == null ? "" : request.email().trim().toLowerCase();
        if (normalizedEmail.isBlank()) {
            throw new BusinessException(UserErrorCode.USER_EMAIL_NOT_FOUND);
        }
        boolean isValid = verificationCodeService.verifyEmailCode(normalizedEmail, request.code());
        if (!isValid) {
            throw new BusinessException(UserErrorCode.VERIFICATION_CODE_MISMATCH);
        }
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));
        if (user.getDeletedAt() != null) {
            throw new BusinessException(UserErrorCode.USER_EMAIL_NOT_FOUND);
        }
        user.setPassword(passwordEncoder.encode(request.newPassword()));
    }

    public void signout(Long userId, SignoutRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof PrincipalDetails)) {
            throw new BusinessException(UserErrorCode.UNAUTHENTICATED);
        }

        PrincipalDetails principalDetails = (PrincipalDetails) authentication.getPrincipal();
        User user = principalDetails.getUser();

        User currentUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));
        if (currentUser.getDeletedAt() != null) {
            throw new BusinessException(UserErrorCode.ACCOUNT_ALREADY_DELETED);
        }

        String encodedPassword = currentUser.getPassword();
        if (encodedPassword == null || encodedPassword.isBlank()) {
            throw new BusinessException(UserErrorCode.OAUTH_ACCOUNT_NO_PASSWORD);
        }
        if (!passwordEncoder.matches(request.password(), encodedPassword)) {
            throw new BusinessException(UserErrorCode.PASSWORD_MISMATCH);
        }

        currentUser.delete();
        refreshTokenStore.delete(user.getEmail());
        SecurityContextHolder.clearContext();
    }

    private TokenResponse issueTokenResponse(User user) {
        String accessToken = jwtTokenProvider.createAccessToken(user.getEmail(), user.getRole().getValue());
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getEmail(), user.getRole().getValue());

        try {
            refreshTokenStore.save(user.getEmail(), refreshToken);
        } catch (Exception e) {
            log.warn("Login succeeded, but failed to store refresh token in Redis: {}", e.getMessage());
        }

        return TokenResponse.builder()
                .grantType("bearer")
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .accessTokenExpiresIn(3600000L)
                .role(user.getRole().name())
                .build();
    }
}
