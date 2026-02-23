package org.example.backend.global.security.jwt;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
public class RefreshTokenStore {
    private final StringRedisTemplate redisTemplate;

    @Value("${app.redis.ttl.refresh-token-seconds:1209600}")
    private long refreshTokenExpireSeconds;

    public void save(String email, String refreshToken) {
        redisTemplate.opsForValue().set(
                email,
                refreshToken,
                refreshTokenExpireSeconds,
                TimeUnit.SECONDS
        );
    }

    public String get(String email) {
        return redisTemplate.opsForValue().get(email);
    }

    public void delete(String email) {
        redisTemplate.delete(email);
    }

    public boolean exists(String email) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(email));
    }
}
