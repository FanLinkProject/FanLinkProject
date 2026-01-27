package org.example.backend.user.service;

import lombok.RequiredArgsConstructor;
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
import org.example.backend.user.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenStore refreshTokenStore;

    // 회원가입
    public SignupResponse signup(SignupRequest request) {
        // 이메일 중복 확인
        if (userRepository.existsByEmail(request.email())) {
            throw new RuntimeException("이미 존재하는 이메일입니다: " + request.email());
        }

        // 닉네임 중복 확인
        if (userRepository.existsByNickname(request.nickname())) {
            throw new RuntimeException("이미 존재하는 닉네임입니다: " + request.nickname());
        }

        // User 엔티티 생성
        User user = User.of(
                request.email(),
                request.nickname(),
                passwordEncoder.encode(request.password()),
                UserRole.USER
        );

        // 추가 필드 설정
        user.setName(request.name());
        user.setGender(request.gender());
        user.setBirth(request.birth());
        user.setPrivacyPolicyAgreed(request.privacyPolicyAgreed() != null ? request.privacyPolicyAgreed() : false);
        user.setPhoneNumber(request.phoneNumber());

        // User 저장
        User savedUser = userRepository.save(user);

        // JWT 토큰 생성
        String accessToken = jwtTokenProvider.createToken(savedUser.getEmail(), savedUser.getRole().getValue());
        String refreshToken = jwtTokenProvider.createToken(savedUser.getEmail(), savedUser.getRole().getValue());

        // RefreshToken 저장
        refreshTokenStore.save(savedUser.getEmail(), refreshToken);

        return SignupResponse.from(savedUser, accessToken, refreshToken);
    }

    // 로그인
    @Transactional(readOnly = true)
    public TokenResponse login(LoginRequest request) {
        // 이메일로 사용자 조회
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다: " + request.email()));

        // 비밀번호 검증
        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new RuntimeException("비밀번호가 일치하지 않습니다.");
        }

        // 계정 상태 확인
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new RuntimeException("비활성화된 계정입니다. 상태: " + user.getStatus());
        }

        // JWT 토큰 생성
        String accessToken = jwtTokenProvider.createToken(user.getEmail(), user.getRole().getValue());
        //String refreshToken = jwtTokenProvider.createToken(user.getEmail(), user.getRole().getValue());

        // RefreshToken 저장
        //refreshTokenStore.save(user.getEmail(), refreshToken);
        return new TokenResponse("bearer", accessToken, 3600000L);
        //return TokenResponse(accessToken);//, refreshToken);
    }

    // 로그아웃
    public void logout(String refreshToken) {
        // RefreshToken 유효성 검증
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new RuntimeException("유효하지 않은 토큰입니다.");
        }

        String email = jwtTokenProvider.getUserEmail(refreshToken);

        // RefreshToken 삭제
        refreshTokenStore.delete(email);
        SecurityContextHolder.clearContext();
    }

    // 회원 탈퇴
    public void delete() {
        // 사용자 정보
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !(authentication.getPrincipal() instanceof PrincipalDetails)) {
            throw new RuntimeException("인증된 사용자가 없습니다.");
        }

        PrincipalDetails principalDetails = (PrincipalDetails) authentication.getPrincipal();
        User user = principalDetails.getUser();

        // 이미 탈퇴한 사용자인지 확인
        if (user.getDeletedAt() != null) {
            throw new RuntimeException("이미 탈퇴한 계정입니다.");
        }

        // 회원 탈퇴 처리
        user.delete();
        userRepository.save(user);

        SecurityContextHolder.clearContext();
    }
}