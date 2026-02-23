package org.example.backend.user.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.user.dto.request.LoginRequest;
import org.example.backend.user.dto.request.LogoutRequest;
import org.example.backend.user.dto.request.OAuthCodeExchangeRequest;
import org.example.backend.user.dto.request.EmailVerificationCodeRequest;
import org.example.backend.user.dto.request.PasswordResetRequest;
import org.example.backend.user.dto.request.PasswordResetRequestRequest;
import org.example.backend.user.dto.request.SignoutRequest;
import org.example.backend.user.dto.request.SignupRequest;
import org.example.backend.user.dto.response.SignupResponse;
import org.example.backend.user.dto.response.TokenResponse;
import org.example.backend.user.exception.UserErrorCode;
import org.example.backend.user.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    // 회원가입
    @PostMapping("/signup")
    public ResponseEntity<SignupResponse> signup(@Valid @RequestBody SignupRequest request) {
        SignupResponse response = authService.signup(request);
        return ResponseEntity.ok(response);
    }

    // 로그인
    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        TokenResponse token = authService.login(request);
        return ResponseEntity.ok(token);
    }

    // 소셜 로그인(OAuth2) 콜백에서 전달된 임시 코드로 JWT 토큰(access/refresh) 발급
    @PostMapping("/oauth/exchange")
    public ResponseEntity<TokenResponse> exchangeOAuthCode(@Valid @RequestBody OAuthCodeExchangeRequest request) {
        TokenResponse token = authService.exchangeOAuthCode(request.code());
        return ResponseEntity.ok(token);
    }

    // Access Token 갱신 (Refresh Token으로 새 Access Token 발급)
    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@RequestParam("refreshToken") String refreshToken) {
        TokenResponse token = authService.refresh(refreshToken);
        return ResponseEntity.ok(token);
    }

    // 비밀번호 찾기: 이메일로 인증 코드 발송 (회원 존재 시에만)
    @PostMapping("/password-reset/send")
    public ResponseEntity<Void> passwordResetSend(@Valid @RequestBody PasswordResetRequestRequest request) {
        authService.passwordResetSend(request.email());
        return ResponseEntity.noContent().build();
    }

    // 비밀번호 찾기: 인증 코드 검증만 (소비하지 않음, 다음 단계 확인용)
    @PostMapping("/password-reset/verify")
    public ResponseEntity<Void> passwordResetVerify(@Valid @RequestBody EmailVerificationCodeRequest request) {
        authService.passwordResetVerify(request.email(), request.code());
        return ResponseEntity.noContent().build();
    }

    // 비밀번호 찾기: 인증 코드 검증 후 비밀번호 변경
    @PostMapping("/password-reset")
    public ResponseEntity<Void> passwordReset(@Valid @RequestBody PasswordResetRequest request) {
        authService.passwordReset(request);
        return ResponseEntity.noContent().build();
    }

    // 로그아웃
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody LogoutRequest request) {
        authService.logout(request.refreshToken());
        return ResponseEntity.noContent().build();
    }

    // 회원탈퇴 (비밀번호 확인 필수)
    @DeleteMapping
    public ResponseEntity<Void> signout(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @Valid @RequestBody SignoutRequest request) {
        if (principalDetails == null) {
            throw new BusinessException(UserErrorCode.UNAUTHENTICATED);
        }

        authService.signout(principalDetails.getUserId(), request);
        return ResponseEntity.noContent().build();
    }
}
