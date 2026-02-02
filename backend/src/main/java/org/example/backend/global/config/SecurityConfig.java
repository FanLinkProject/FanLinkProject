package org.example.backend.global.config;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.jwt.JwtAuthenticationFilter;
import org.example.backend.global.security.jwt.JwtTokenProvider;
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

    // 비밀번호 암호화
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())

                // 세션 관리 상태 없음 설정
                .sessionManagement(session ->
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // 요청별 인증/인가 설정
                .authorizeHttpRequests(auth -> auth
                    // 인증 X
                    .requestMatchers(
                        "/api/auth/**",           // 인증 관련 API (로그인, 회원가입 등)
                        "/api/verification/**",   // 인증 코드 발송/검증 API
                        "/error"                  // 에러 페이지(인증안된 경로 일때 )
                    ).permitAll()

                    // 관리자
                    .requestMatchers("/api/admin/**")
                    .hasRole("ADMIN")

                    // 아티스트
                    .requestMatchers("/api/artist/**")
                    .hasAnyRole("ARTIST", "ADMIN")

                    // 유저(팬)
                    .requestMatchers("/api/user/**")
                    .hasAnyRole("USER", "ARTIST", "ADMIN")

                    // 그 외 모든 요청은 인증 필요
                    .anyRequest().authenticated()
                )
                .formLogin(AbstractHttpConfigurer::disable)
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
                )
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider), UsernamePasswordAuthenticationFilter.class);

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
