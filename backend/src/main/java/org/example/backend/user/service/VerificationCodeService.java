package org.example.backend.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Random;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class VerificationCodeService {

    private final StringRedisTemplate redisTemplate;
    
    /** 인증 코드 길이 (6자리) */
    private static final int CODE_LENGTH = 6;
    
    /** 인증 코드 유효 시간 (5분) */
    private static final long CODE_EXPIRE_TIME = 5;
    
    /** 인증 코드 유효 시간 단위 */
    private static final TimeUnit CODE_EXPIRE_UNIT = TimeUnit.MINUTES;
    
    /** Redis 키 접두사 - 이메일 인증 코드 */
    private static final String EMAIL_CODE_PREFIX = "email:code:";
    
    /** Redis 키 접두사 - 전화번호 인증번호 */
    private static final String PHONE_CODE_PREFIX = "phone:code:";


    // 6자리 랜덤 숫자 인증 코드 생성
    public String generateCode() {
        Random random = new Random();
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < CODE_LENGTH; i++) {
            code.append(random.nextInt(10));
        }
        return code.toString();
    }

    // 이메일 인증 코드를 Redis에 저장
    public void saveEmailCode(String email, String code) {
        String key = EMAIL_CODE_PREFIX + email;
        redisTemplate.opsForValue().set(
                key,
                code,
                CODE_EXPIRE_TIME,
                CODE_EXPIRE_UNIT
        );
    }

    // 전화번호 인증번호를 Redis에 저장
    public void savePhoneCode(String phoneNumber, String code) {
        String key = PHONE_CODE_PREFIX + phoneNumber;
        redisTemplate.opsForValue().set(
                key,
                code,
                CODE_EXPIRE_TIME,
                CODE_EXPIRE_UNIT
        );
    }

    // 이메일 인증 코드 검증
    public boolean verifyEmailCode(String email, String code) {
        String key = EMAIL_CODE_PREFIX + email;
        String storedCode = redisTemplate.opsForValue().get(key);
        
        if (storedCode == null) {
            return false; // 인증 코드가 없거나 만료됨
        }
        
        if (storedCode.equals(code)) {
            // 검증 성공 시 인증 코드 삭제 (1회용)
            redisTemplate.delete(key);
            return true;
        }
        
        return false;
    }

    // 전화번호 인증번호 검증
    public boolean verifyPhoneCode(String phoneNumber, String code) {
        String key = PHONE_CODE_PREFIX + phoneNumber;
        String storedCode = redisTemplate.opsForValue().get(key);
        
        if (storedCode == null) {
            return false; // 인증번호가 없거나 만료됨
        }
        
        if (storedCode.equals(code)) {
            // 검증 성공 시 인증번호 삭제 (1회용)
            redisTemplate.delete(key);
            return true;
        }
        
        return false;
    }

    // 이메일 인증 코드 존재 여부 확인
    public boolean hasEmailCode(String email) {
        String key = EMAIL_CODE_PREFIX + email;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }

    // 전화번호 인증번호 존재 여부 확인
    public boolean hasPhoneCode(String phoneNumber) {
        String key = PHONE_CODE_PREFIX + phoneNumber;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }
}
