package org.example.backend.user.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
@RequiredArgsConstructor
public class RateLimitService {
    private static final String RATE_LIMIT_PREFIX = "rate-limit:";

    private final StringRedisTemplate redisTemplate;
    private final Map<String, CounterEntry> fallbackStore = new ConcurrentHashMap<>();

    private record CounterEntry(long count, long expiresAtEpochMillis) {
    }

    public boolean tryAcquire(String key, long limit, Duration window) {
        if (key == null || key.isBlank()) {
            return true;
        }

        String storeKey = RATE_LIMIT_PREFIX + key;
        try {
            Long count = redisTemplate.opsForValue().increment(storeKey);
            if (count != null && count == 1L) {
                redisTemplate.expire(storeKey, window);
            }
            return count == null || count <= limit;
        } catch (Exception e) {
            long now = System.currentTimeMillis();
            CounterEntry entry = fallbackStore.compute(storeKey, (k, existing) -> {
                if (existing == null || existing.expiresAtEpochMillis() <= now) {
                    return new CounterEntry(1L, now + window.toMillis());
                }
                return new CounterEntry(existing.count() + 1L, existing.expiresAtEpochMillis());
            });
            log.warn("Rate limit Redis fallback: key={}, cause={}", storeKey, e.getMessage());
            return entry.count() <= limit;
        }
    }

    public void clear(String key) {
        if (key == null || key.isBlank()) {
            return;
        }

        String storeKey = RATE_LIMIT_PREFIX + key;
        try {
            redisTemplate.delete(storeKey);
        } catch (Exception e) {
            log.warn("Rate limit clear Redis failed: key={}, cause={}", storeKey, e.getMessage());
        }
        fallbackStore.remove(storeKey);
    }
}
