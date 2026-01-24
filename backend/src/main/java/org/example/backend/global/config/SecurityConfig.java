package org.example.backend.global.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    private final CorsConfigurationSource corsConfigurationSource;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // 기본 보안 설정 비활성화
            .csrf(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            
            // CORS 설정 적용
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            
            // 세션 관리 상태 없음 설정
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // 요청별 인증/인가 설정
            .authorizeHttpRequests(auth -> auth
                // 인증 X
                .requestMatchers(
                    "/api/auth/**",           // 인증 관련 API (로그인, 회원가입 등)
                    "/error"                  // 에러 페이지
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
            );
        
        return http.build();
    }

    // 비밀번호 암호화
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
