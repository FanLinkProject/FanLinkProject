package org.example.backend.user.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.user.Service.AuthService;
import org.example.backend.user.dto.request.SignupRequest;
import org.example.backend.user.dto.response.TokenResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<String> signup(@RequestBody SignupRequest request) {
        authService.signup(request);
        return ResponseEntity.ok().build("회원가입이 완료되었습니다.");

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@RequestBody loginRequest request) {
        TokenResponse totken = authService.login(request);
        return ResponseEntity.ok(token);
        }
    }
}
