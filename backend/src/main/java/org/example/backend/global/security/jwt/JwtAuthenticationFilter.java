package org.example.backend.global.security.jwt;

//아마.. 토큰값 쿠키로 교체해야 할수도..?
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

//@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        // OAuth2 관련 경로는 JWT 필터를 건너뛰기
        String requestPath = request.getRequestURI();
        if (requestPath.startsWith("/oauth2/") || 
            requestPath.startsWith("/login/oauth2/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String accessToken = resolveToken(request);

        try {
            if (accessToken != null && jwtTokenProvider.validateToken(accessToken)) {
                Authentication authentication = jwtTokenProvider.getAuthentication(accessToken);
                SecurityContextHolder.getContext().setAuthentication(authentication);

                String email = jwtTokenProvider.getUserEmail(accessToken);

            }
        } catch (Exception e) {
            logger.warn("효력없는 JWT토큰 입니다." + e);
        }
        filterChain.doFilter(request, response);

    }

    private String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer")) {

            return bearerToken.substring(7, bearerToken.length());//1주일 유효
        }
        return null;
    }
}

