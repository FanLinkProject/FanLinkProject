package org.example.backend.global.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.service.PrincipalDetailsService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;


@Component
@RequiredArgsConstructor
public class JwtTokenProvider {

    private final PrincipalDetailsService principalDetailsService;

    @Value("${jwt.secret:fanlink!cheerup!kkkkkkk!fighting}")//이거 나중에.. 32자..써야되요
    private String secretKey;

    private SecretKey key;

    // Access Token 유효시간: 1시간
    private final long accessTokenValidTime = 60 * 60 * 1000L;

    // Refresh Token 유효시간: 14일
    private final long refreshTokenValidTime = 14 * 24 * 60 * 60 * 1000L;

    @PostConstruct
    protected void init() {

        this.key = Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
    }

    // Access Token 생성
    public String createAccessToken(String email, String role) {
        return createTokenInternal(email, role, accessTokenValidTime);
    }

    // Refresh Token 생성
    public String createRefreshToken(String email, String role) {
        return createTokenInternal(email, role, refreshTokenValidTime);
    }

    //내부토큰생성로직(공통)
    private String createTokenInternal(String email, String role, long validTime) {
        Claims claims = Jwts.claims().subject(email).build();
        Date now = new Date();

        return Jwts.builder()
                .claims(claims)
                .claim("role", role)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + validTime))
                .signWith(key)
                .compact();
    }



    //토큰에서 인증정보 조회 로직
    public Authentication getAuthentication(String token) {
        String email = this.getUserEmail(token);
        UserDetails userDetails = principalDetailsService.loadUserByUsername(email);
        return new UsernamePasswordAuthenticationToken(userDetails, "", userDetails.getAuthorities());
    }
    //토큰에서 회원정보(이메일) 추출
    public String getUserEmail(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }
    // 토큰 유효성 검증
    public boolean validateToken(String jwtToken) {
        try {
            Jws<Claims> claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(jwtToken);
            return !claims.getPayload().getExpiration().before(new Date());
        } catch (Exception e) {
            return false;
        }
    }

}