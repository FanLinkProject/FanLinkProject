package org.example.backend.global.security.jwt;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
public class RefreshTokenStore {
    private final StringRedisTemplate redisTemplate;

    // Refresh Token 유효기간 (14일)(일*시*분*초)
    // Redis의 TTL(Time To Live) 기능 - 시간 지나면 자동삭제
    private final long REFRESH_TOKEN_EXPIRE_TIME = 14 * 24 * 60 * 60;

    //Redis 명령어 주석으로 각 부분마다 달아두겠습니다.
    public void save(String email, String refreshToken) {
        //SET email refreshToken EX 1209600
        redisTemplate.opsForValue().set(
                email,
                refreshToken,
                REFRESH_TOKEN_EXPIRE_TIME,
                TimeUnit.SECONDS
        );
    }

    //GET email
    public String get(String email) {
        return redisTemplate.opsForValue().get(email);
    }

    //DEL email
    public void delete(String email) {
        redisTemplate.delete(email);
    }

    // RefreshToken 존재 여부 확인
    public boolean exists(String email) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(email));
    }
}
