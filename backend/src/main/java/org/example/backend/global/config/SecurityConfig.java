package org.example.backend.global.config;

import static org.apache.tomcat.util.http.Method.*;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.jwt.JwtAuthenticationFilter;
import org.example.backend.global.security.jwt.JwtTokenProvider;
import org.example.backend.global.security.oauth2.OAuth2SuccessHandler;
import org.example.backend.global.security.service.PrincipalOAuth2UserService;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
@EnableMethodSecurity(securedEnabled = true)
public class SecurityConfig {

    private final CorsConfigurationSource corsConfigurationSource;
    private final JwtTokenProvider jwtTokenProvider;
    private final PrincipalOAuth2UserService principalOAuth2UserService;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;
    private final ClientRegistrationRepository clientRegistrationRepository;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // CSRF 비활성화 (JWT 기반 인증 사용)
            .csrf(csrf -> csrf.disable())

            // 세션 관리: STATELESS (JWT 기반 인증으로 세션 사용 안 함)
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // 요청별 인증/인가 설정
            .authorizeHttpRequests(auth -> auth
                // 테스트용 코드 추후 삭제- 테스트 페이지 접근 허용
                .requestMatchers(
                        "/",
                        "/index.html",
                        "/callback.html",
                        "/favicon.ico",
                        "/css/**",
                        "/js/**"
                    ).permitAll()
                    // 인증없이 접근 가능한 경로
                    .requestMatchers(
                        "/api/auth/**",           // 인증 관련 API (로그인, 회원가입 등)
                        "/api/verification/**",   // 인증 코드 발송/검증 API
                        "/api/home",               // 통합 홈 화면 API (역할별 응답)
                        "/api/guest/**",          // 비로그인 유저 메인 홈 화면 API (하위 호환)
                        "/api/user/artists/*/dashboard",  // 특정 아티스트 대시보드 (비로그인 접근 가능)
                        "/login/oauth2/**",       // OAuth2 로그인 콜백 URL
                        "/oauth2/**",             // OAuth2 관련 URL
                        "/error"                  // 에러 페이지(인증안된 경로 일때 )
                    ).permitAll()
                    .requestMatchers(GET, "/api/artists/*/music-videos").permitAll()
                    .requestMatchers(GET, "/api/artists/*/music-videos/*").permitAll()
                    .requestMatchers("/api/payments/toss/**").permitAll()
                    .requestMatchers("/api/artist-posts/notices").permitAll()
                    // 정산 관련 (아티스트/그룹/관리자 전용)
                    .requestMatchers("/api/settlements/**")
                    .hasAnyRole("ARTIST", "GROUP", "ADMIN")
                    // 결제, 구독, 주문 관련 (인증된 사용자)
                    .requestMatchers(
                            "/api/products/**",
                            "/api/payments/**",
                            "/api/subscriptions/**",
                            "/api/orders/**")
                    .authenticated()

                .requestMatchers(
					"/ws-chat/**",
					"/api/chat/DM/**" // ✅ 채팅 DM 방 조회 API 인증 없이 허용
                ).permitAll()
				.requestMatchers(GET, "/api/live-sessions/*/access").authenticated()
				.requestMatchers(GET, "/api/live-sessions/**").permitAll()

                    // 관리자
                    .requestMatchers("/api/admin/**")
                    .hasRole("ADMIN")
                
                // 아티스트, 관리자
                .requestMatchers("/api/artist/**")
                    .hasAnyRole("ARTIST", "GROUP", "ADMIN")

                // 마일스톤(등급) - 아티스트 전용
                .requestMatchers("/api/milestones/**", "/api/milestone/**")
                    .hasAnyRole("ARTIST", "GROUP", "ADMIN")

                // 팬 프로필(등급 현황) - 인증된 사용자
                .requestMatchers("/api/fan-profiles/**")
                    .authenticated()

                // 유저(팬), 아티스트, 그룹, 관리자
                .requestMatchers("/api/user/**")
                    .hasAnyRole("USER", "ARTIST", "GROUP", "ADMIN")
                
                // 그 외 모든 요청은 인증 필요
                .anyRequest().authenticated()
            )

            // OAuth2 로그인 설정
            .oauth2Login(oauth2 -> oauth2
                // 사용자 정보 엔드포인트 설정 (PrincipalOAuth2UserService 사용)
                .userInfoEndpoint(userInfo -> userInfo
                    .userService(principalOAuth2UserService)
                )
                // 로그인 성공 핸들러 (JWT 토큰 생성 및 프론트엔드 리다이렉트)
                .successHandler(oAuth2SuccessHandler)
            )

            // JWT 인증 필터 추가 (UsernamePasswordAuthenticationFilter 전에 실행)
            .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider), UsernamePasswordAuthenticationFilter.class)

            // 폼 로그인 비활성화 (JWT 기반 인증 사용)
            .formLogin(AbstractHttpConfigurer::disable)

            // 인증 실패 시 401 Unauthorized 응답
            .exceptionHandling(exception -> exception
                    .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
            )

            // CORS 설정 적용
            .cors(cors -> cors.configurationSource(corsConfigurationSource()));

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:3000"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
