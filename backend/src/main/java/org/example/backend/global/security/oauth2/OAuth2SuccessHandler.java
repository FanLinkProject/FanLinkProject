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

    @Value("${oauth2.redirect-uri:http://localhost:3000/oauth2/login/success}")
    private String redirectUri;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        try {
            PrincipalDetails principalDetails = (PrincipalDetails) authentication.getPrincipal();
            User user = principalDetails.getUser();
            
            //1. jwt 토큰 생성
            String token = jwtTokenProvider.createToken(user.getEmail(), user.getRole().getValue());

            log.info("OAuth2 로그인 성공 - Email: {}, Role: {}", user.getEmail(), user.getRole());

            // 2. 프론트엔드로 리다이렉트 (쿼리 스트링에 토큰 포함)
            // UriComponentsBuilder를 사용하면 URL 파라미터 생성
            String targetUrl = UriComponentsBuilder.fromUriString(redirectUri)
                    .queryParam("token", token)
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
