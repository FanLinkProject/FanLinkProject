package org.example.backend.global.security.oauth2;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Component
@Slf4j
@RequiredArgsConstructor
public class OAuthAuthorizationCodeStore {
    private static final String CODE_PREFIX = "oauth:code:";

    private final StringRedisTemplate redisTemplate;
    private final Map<String, CodeEntry> fallbackStore = new ConcurrentHashMap<>();

    @Value("${app.redis.ttl.oauth-code-seconds:120}")
    private long oauthCodeExpireSeconds;

    public record OAuthCodePayload(String email, String role) {
    }

    private record CodeEntry(String value, long expiresAtEpochMillis) {
    }

    public String createCode(String email, String role) {
        String code = UUID.randomUUID().toString().replace("-", "");
        save(redisKey(code), serialize(email, role));
        return code;
    }

    public OAuthCodePayload consume(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }

        String key = redisKey(code.trim());
        String serialized = null;
        boolean fromRedis = true;
        try {
            serialized = redisTemplate.opsForValue().get(key);
            if (serialized != null) {
                redisTemplate.delete(key);
            }
        } catch (Exception e) {
            fromRedis = false;
            serialized = consumeFromFallback(key);
            log.warn("OAuth code Redis consume fallback: key={}, cause={}", key, e.getMessage());
        }

        if (serialized == null) {
            return null;
        }

        if (!fromRedis) {
            fallbackStore.remove(key);
        }

        return deserialize(serialized);
    }

    private void save(String key, String value) {
        try {
            redisTemplate.opsForValue().set(key, value, oauthCodeExpireSeconds, TimeUnit.SECONDS);
        } catch (Exception e) {
            long expiresAt = Instant.now().plusSeconds(oauthCodeExpireSeconds).toEpochMilli();
            fallbackStore.put(key, new CodeEntry(value, expiresAt));
            log.warn("OAuth code Redis save fallback: key={}, cause={}", key, e.getMessage());
        }
    }

    private String consumeFromFallback(String key) {
        CodeEntry entry = fallbackStore.remove(key);
        if (entry == null) {
            return null;
        }
        if (entry.expiresAtEpochMillis() < System.currentTimeMillis()) {
            return null;
        }
        return entry.value();
    }

    private String serialize(String email, String role) {
        return email + "\n" + role;
    }

    private OAuthCodePayload deserialize(String value) {
        int idx = value.indexOf('\n');
        if (idx <= 0 || idx >= value.length() - 1) {
            return null;
        }

        String email = value.substring(0, idx);
        String role = value.substring(idx + 1);
        if (email.isBlank() || role.isBlank()) {
            return null;
        }
        return new OAuthCodePayload(email, role);
    }

    private String redisKey(String code) {
        return CODE_PREFIX + code;
    }
}
