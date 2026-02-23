package org.example.backend.user.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
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

    @Value("${app.redis.ttl.verification-code-minutes:5}")
    private long verificationCodeExpireMinutes;

    @Value("${app.redis.ttl.phone-verified-minutes:10}")
    private long phoneVerifiedExpireMinutes;

    // Redis unavailable fallback in-memory store.
    private final Map<String, CodeEntry> fallbackStore = new ConcurrentHashMap<>();

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
        String key = PHONE_CODE_PREFIX + normalizePhone(phoneNumber);
        saveCode(key, code);
    }

    public boolean verifyEmailCode(String email, String code) {
        String key = EMAIL_CODE_PREFIX + email;
        return verifyCode(key, code, true);
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
        String normalizedPhone = normalizePhone(phoneNumber);
        String key = PHONE_CODE_PREFIX + normalizedPhone;
        boolean verified = verifyCode(key, code, true);
        if (verified) {
            markPhoneVerified(normalizedPhone);
        }
        return verified;
    }

    // Check-only verification for pre-signup step; keeps code for final signup consumption.
    public boolean checkPhoneCode(String phoneNumber, String code) {
        String normalizedPhone = normalizePhone(phoneNumber);
        String key = PHONE_CODE_PREFIX + normalizedPhone;
        boolean verified = verifyCode(key, code, false);
        if (verified) {
            markPhoneVerified(normalizedPhone);
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
        String key = PHONE_CODE_PREFIX + normalizePhone(phoneNumber);
        return hasCode(key);
    }

    public boolean consumePhoneVerified(String phoneNumber) {
        String key = PHONE_VERIFIED_PREFIX + normalizePhone(phoneNumber);
        try {
            Boolean exists = redisTemplate.hasKey(key);
            if (Boolean.TRUE.equals(exists)) {
                redisTemplate.delete(key);
                return true;
            }
        } catch (Exception e) {
            log.warn("Redis phone verified consume failed. key={}, cause={}", key, e.getMessage());
        }
        return consumeVerifiedFromFallback(key);
    }

    private void markPhoneVerified(String phoneNumber) {
        String key = PHONE_VERIFIED_PREFIX + normalizePhone(phoneNumber);
        try {
            redisTemplate.opsForValue().set(key, "1", phoneVerifiedExpireMinutes, TimeUnit.MINUTES);
        } catch (Exception e) {
            long expireAt = Instant.now()
                    .plusSeconds(TimeUnit.MINUTES.toSeconds(phoneVerifiedExpireMinutes))
                    .toEpochMilli();
            fallbackStore.put(key, new CodeEntry("1", expireAt));
            log.warn("Redis phone verified mark failed. key={}, cause={}", key, e.getMessage());
        }
    }

    private String normalizePhone(String phoneNumber) {
        return phoneNumber == null ? "" : phoneNumber.replaceAll("[^0-9]", "");
    }

    private void saveCode(String key, String code) {
        try {
            redisTemplate.opsForValue().set(key, code, verificationCodeExpireMinutes, TimeUnit.MINUTES);
        } catch (Exception e) {
            long expireAt = Instant.now()
                    .plusSeconds(TimeUnit.MINUTES.toSeconds(verificationCodeExpireMinutes))
                    .toEpochMilli();
            fallbackStore.put(key, new CodeEntry(code, expireAt));
            log.warn("Redis save failed. key={}, cause={}", key, e.getMessage());
        }
    }

    private boolean verifyCode(String key, String inputCode, boolean consumeOnSuccess) {
        String storedCode;
        boolean fromRedis = true;

        try {
            storedCode = redisTemplate.opsForValue().get(key);
        } catch (Exception e) {
            fromRedis = false;
            storedCode = getFromFallback(key);
            log.warn("Redis get failed. key={}, cause={}", key, e.getMessage());
        }

        if (storedCode == null || !storedCode.equals(inputCode)) {
            return false;
        }

        if (consumeOnSuccess) {
            if (fromRedis) {
                try {
                    redisTemplate.delete(key);
                } catch (Exception e) {
                    fallbackStore.remove(key);
                    log.warn("Redis delete failed. key={}, cause={}", key, e.getMessage());
                }
            } else {
                fallbackStore.remove(key);
            }
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

    private boolean consumeVerifiedFromFallback(String key) {
        String marker = getFromFallback(key);
        if (marker == null) {
            return false;
        }
        fallbackStore.remove(key);
        return true;
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
