package org.example.backend.global.config;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.jwt.JwtAuthenticationFilter;
import org.example.backend.global.security.jwt.JwtTokenProvider;
import org.example.backend.global.security.oauth2.OAuth2SuccessHandler;
import org.example.backend.global.security.oauth2.PrincipalOAuth2UserService;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
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

    // 비밀번호 암호화
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

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
                // 인증 없이 접근 가능한 경로
                .requestMatchers(
                    "/api/auth/**",           // 인증 관련 API (로그인, 회원가입 등)
                    "/login/oauth2/**",       // OAuth2 로그인 콜백 URL
                    "/oauth2/**",             // OAuth2 관련 URL
                    "/error"                  // 에러 페이지
                ).permitAll()

                // 관리자
                .requestMatchers("/api/admin/**")
                    .hasRole("ADMIN")
                
                // 아티스트, 관리자
                .requestMatchers("/api/artist/**")
                    .hasAnyRole("ARTIST", "ADMIN")
                
                // 유저(팬), 아티스트, 관리자
                .requestMatchers("/api/user/**")
                    .hasAnyRole("USER", "ARTIST", "ADMIN")
                
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
