package org.example.backend.user.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.security.SecureRandom;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
@RequiredArgsConstructor
public class VerificationCodeService {

    private final StringRedisTemplate redisTemplate;

    private static final int CODE_LENGTH = 6;
    private static final long CODE_EXPIRE_TIME = 5;
    private static final TimeUnit CODE_EXPIRE_UNIT = TimeUnit.MINUTES;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private static final String EMAIL_CODE_PREFIX = "email:code:";
    private static final String PHONE_CODE_PREFIX = "phone:code:";
    private static final String PHONE_VERIFIED_PREFIX = "phone:verified:";

    // Redis 장애 대비 인메모리 폴백 저장소
    private final Map<String, CodeEntry> fallbackStore = new ConcurrentHashMap<>();
    private final Map<String, Long> phoneVerifiedFallback = new ConcurrentHashMap<>();
    private static final long PHONE_VERIFIED_TTL_MS = 10 * 60 * 1000; // 10분

    private record CodeEntry(String code, long expiresAtEpochMillis) {
    }

    public String generateCode() {
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < CODE_LENGTH; i++) {
            code.append(SECURE_RANDOM.nextInt(10));
        }
        return code.toString();
    }

    public void saveEmailCode(String email, String code) {
        String key = EMAIL_CODE_PREFIX + email;
        saveCode(key, code);
    }

    public void savePhoneCode(String phoneNumber, String code) {
        String key = PHONE_CODE_PREFIX + phoneNumber;
        saveCode(key, code);
    }

    public boolean verifyEmailCode(String email, String code) {
        String key = EMAIL_CODE_PREFIX + email;
        return verifyCode(key, code);
    }

    /** 이메일 인증코드 검증만 (소비하지 않음). 비밀번호 찾기 확인용 */
    public boolean validateEmailCodeWithoutConsume(String email, String code) {
        String key = EMAIL_CODE_PREFIX + email;
        String storedCode = null;
        try {
            storedCode = redisTemplate.opsForValue().get(key);
        } catch (Exception e) {
            storedCode = getFromFallback(key);
        }
        return storedCode != null && storedCode.equals(code);
    }

    public boolean verifyPhoneCode(String phoneNumber, String code) {
        String key = PHONE_CODE_PREFIX + phoneNumber;
        boolean verified = verifyCode(key, code);
        if (verified) {
            markPhoneVerified(phoneNumber);
        }
        return verified;
    }

    /** 코드 검증만 (소비하지 않음). 회원가입 전 프론트 확인용 */
    public boolean validatePhoneCodeWithoutConsume(String phoneNumber, String code) {
        String key = PHONE_CODE_PREFIX + phoneNumber;
        String storedCode = null;
        try {
            storedCode = redisTemplate.opsForValue().get(key);
        } catch (Exception e) {
            storedCode = getFromFallback(key);
        }
        return storedCode != null && storedCode.equals(code);
    }

    public boolean hasEmailCode(String email) {
        String key = EMAIL_CODE_PREFIX + email;
        return hasCode(key);
    }

    public boolean hasPhoneCode(String phoneNumber) {
        String key = PHONE_CODE_PREFIX + phoneNumber;
        return hasCode(key);
    }

    public boolean consumePhoneVerified(String phoneNumber) {
        String key = PHONE_VERIFIED_PREFIX + phoneNumber;
        try {
            Boolean exists = redisTemplate.hasKey(key);
            if (Boolean.TRUE.equals(exists)) {
                redisTemplate.delete(key);
                return true;
            }
        } catch (Exception e) {
            log.warn("Redis 조회 실패, 폴백 확인: phone={}, cause={}", phoneNumber, e.getMessage());
        }
        Long expiresAt = phoneVerifiedFallback.remove(key);
        if (expiresAt != null && expiresAt > System.currentTimeMillis()) {
            return true;
        }
        return false;
    }

    private void markPhoneVerified(String phoneNumber) {
        String key = PHONE_VERIFIED_PREFIX + phoneNumber;
        long expiresAt = System.currentTimeMillis() + PHONE_VERIFIED_TTL_MS;
        try {
            redisTemplate.opsForValue().set(key, "1", 10, TimeUnit.MINUTES);
        } catch (Exception e) {
            phoneVerifiedFallback.put(key, expiresAt);
            log.warn("Redis 저장 실패, 폴백으로 휴대폰 인증 상태 저장: phone={}, cause={}", phoneNumber, e.getMessage());
        }
    }

    private void saveCode(String key, String code) {
        try {
            redisTemplate.opsForValue().set(key, code, CODE_EXPIRE_TIME, CODE_EXPIRE_UNIT);
        } catch (Exception e) {
            long expireAt = Instant.now()
                    .plusSeconds(TimeUnit.MINUTES.toSeconds(CODE_EXPIRE_TIME))
                    .toEpochMilli();
            fallbackStore.put(key, new CodeEntry(code, expireAt));
            log.warn("Redis 저장 실패, 메모리 폴백으로 처리: key={}, cause={}", key, e.getMessage());
        }
    }

    private boolean verifyCode(String key, String inputCode) {
        String storedCode = null;
        boolean fromRedis = true;

        try {
            storedCode = redisTemplate.opsForValue().get(key);
        } catch (Exception e) {
            fromRedis = false;
            storedCode = getFromFallback(key);
            log.warn("Redis 조회 실패, 메모리 폴백으로 처리: key={}, cause={}", key, e.getMessage());
        }

        if (storedCode == null) {
            return false;
        }
        if (!storedCode.equals(inputCode)) {
            return false;
        }

        if (fromRedis) {
            try {
                redisTemplate.delete(key);
            } catch (Exception e) {
                fallbackStore.remove(key);
                log.warn("Redis 삭제 실패, 메모리 폴백 정리: key={}, cause={}", key, e.getMessage());
            }
        } else {
            fallbackStore.remove(key);
        }
        return true;
    }

    private boolean hasCode(String key) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(key));
        } catch (Exception e) {
            return getFromFallback(key) != null;
        }
    }

    private String getFromFallback(String key) {
        CodeEntry entry = fallbackStore.get(key);
        if (entry == null) {
            return null;
        }
        if (entry.expiresAtEpochMillis() < System.currentTimeMillis()) {
            fallbackStore.remove(key);
            return null;
        }
        return entry.code();
    }
}
