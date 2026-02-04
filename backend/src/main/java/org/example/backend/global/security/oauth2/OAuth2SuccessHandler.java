package org.example.backend.global.security.oauth2;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.global.security.jwt.JwtTokenProvider;
import org.example.backend.user.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtTokenProvider jwtTokenProvider;

    @Value("${oauth2.redirect-uri:http://localhost:3000}")
    private String redirectUri;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        try {
            // 1. 인증된 사용자 정보 추출
            PrincipalDetails principalDetails = (PrincipalDetails) authentication.getPrincipal();
            User user = principalDetails.getUser();
            
            // 2. JWT 토큰 생성 (이메일과 역할을 포함)
            String refreshToken = jwtTokenProvider.createRefreshToken(user.getEmail(), user.getRole().getValue());
            String accessToken = jwtTokenProvider.createAccessToken(user.getEmail(), user.getRole().getValue());


            // 3. 프론트엔드로 리다이렉트 (토큰을 쿼리 파라미터로 전달)
            String targetUrl = UriComponentsBuilder.fromUriString(redirectUri)
                    .queryParam("refreshToken", refreshToken)
                    .queryParam("accessToken", accessToken)
                    .queryParam("tokenType", "Bearer")
                    .build()
                    .encode() // URL 인코딩 처리
                    .toUriString();

            log.info("OAuth2 리다이렉트 URL: {}", targetUrl);
            getRedirectStrategy().sendRedirect(request, response, targetUrl);
        } catch (Exception e) {
            log.error("OAuth2 로그인 성공 처리 중 오류 발생", e);
            // 에러 발생 시 기본 페이지로 리다이렉트
            response.sendRedirect("http://localhost:3000?error=oauth2_failed");
        }
    }
}
