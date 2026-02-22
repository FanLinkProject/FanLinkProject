package org.example.backend.user.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.user.dto.request.LoginRequest;
import org.example.backend.user.service.AuthService;
import org.example.backend.user.dto.request.SignupRequest;
import org.example.backend.user.dto.response.SignupResponse;
import org.example.backend.user.dto.response.TokenResponse;
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

    // Access Token 갱신 (Refresh Token으로 새 Access Token 발급)
    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@RequestParam("refreshToken") String refreshToken) {
        TokenResponse token = authService.refresh(refreshToken);
        return ResponseEntity.ok(token);
    }

    // 로그아웃
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestParam("refreshToken") String refreshToken) {
        authService.logout(refreshToken);
        return ResponseEntity.noContent().build();
    }

    // 회원 탈퇴
    @DeleteMapping
    public ResponseEntity<?> signout(
            @AuthenticationPrincipal PrincipalDetails principalDetails
            ) {
        authService.signout(principalDetails.getUserId());

        return ResponseEntity.noContent().build();
    }
}

