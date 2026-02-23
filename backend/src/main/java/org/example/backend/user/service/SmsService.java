package org.example.backend.user.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.nurigo.sdk.NurigoApp;
import net.nurigo.sdk.message.model.Message;
import net.nurigo.sdk.message.service.DefaultMessageService;
import org.example.backend.global.exception.BusinessException;
import org.example.backend.user.exception.UserErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;

@Slf4j
@Service
@RequiredArgsConstructor
public class SmsService {

    @Value("${sms.api.enabled:false}")
    private boolean smsApiEnabled;

    @Value("${mail.dev-mode:true}")
    private boolean mailDevMode;

    @Value("${sms.api.key:}")
    private String apiKey;

    @Value("${sms.api.secret:}")
    private String apiSecret;

    @Value("${sms.api.from:}")
    private String fromNumber;

    private DefaultMessageService messageService;

    // CoolSMS SDK 초기화
    @PostConstruct
    public void init() {
        // 둘 다 false일 때 개발 모드
        boolean isDevMode = !mailDevMode && !smsApiEnabled;
        
        if (smsApiEnabled && !apiKey.isEmpty() && !apiSecret.isEmpty()) {
            this.messageService = NurigoApp.INSTANCE.initialize(apiKey, apiSecret, "https://api.coolsms.co.kr");
            log.info("CoolSMS 초기화 완료");
        } else if (isDevMode || !smsApiEnabled) {
            log.info("SMS 개발 모드: 실제 SMS 발송 없이 로그만 출력합니다.");
            if (isDevMode) {
                log.info("개발 모드: mail.dev-mode와 sms.api.enabled가 모두 false입니다.");
            }
        } else {
            log.warn("CoolSMS API 키가 설정되지 않았습니다. SMS 발송이 불가능합니다.");
        }
    }

    // 전화번호로 인증번호 발송
    public void sendVerificationCode(String phoneNumber, String code) {
        try {
            // 개발 모드: sms.api.enabled가 false일 때 개발 모드
            boolean isDevMode = !smsApiEnabled;
            
            if (smsApiEnabled && messageService != null && !isDevMode) {
                // 실제 SMS API 호출
                sendSmsViaApi(phoneNumber, code);
            } else {
                // 개발 모드: 로그만 출력
                log.info("=== SMS 인증번호 발송 (개발 모드) ===");
                log.info("수신자: {}", phoneNumber);
                log.info("인증번호: {}", code);
                if (!mailDevMode && !smsApiEnabled) {
                    log.info("개발 모드: mail.dev-mode와 sms.api.enabled가 모두 false입니다.");
                } else {
                    log.info("실제 SMS 발송을 위해서는 application.yml에 sms.api.enabled=true로 설정하세요.");
                }
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("SMS 발송 실패: {}", phoneNumber, e);
            throw new BusinessException(UserErrorCode.SMS_SEND_FAILED);
        }
    }

    // CoolSMS API를 통한 실제 SMS 발송
    private void sendSmsViaApi(String phoneNumber, String code) {
        if (messageService == null) {
            log.warn("CoolSMS 미초기화: SMS_API_KEY, SMS_API_SECRET 확인 필요. 개발 모드로 대체합니다.");
            log.info("=== SMS 인증번호 (발송 생략) 수신: {} / 인증번호: {} ===", phoneNumber, code);
            return;
        }
        if (fromNumber == null || fromNumber.isBlank()) {
            log.warn("발신번호(SMS_FROM) 미설정: CoolSMS 발송 불가. 개발 모드로 대체합니다.");
            log.info("=== SMS 인증번호 (발송 생략) 수신: {} / 인증번호: {} ===", phoneNumber, code);
            return;
        }

        try {
            // 전화번호 형식 변환 (하이픈 제거)
            String cleanPhoneNumber = phoneNumber.replaceAll("-", "");
            
            Message message = new Message();
            message.setFrom(fromNumber);
            message.setTo(cleanPhoneNumber);
            message.setText("[FanLink] 인증번호: " + code);

            // SMS 발송
            messageService.send(message);
            log.info("SMS 인증번호 발송 완료: {} -> {}", phoneNumber, code);
        } catch (Exception e) {
            log.error("CoolSMS 발송 실패: {} (발신번호: {})", phoneNumber, fromNumber, e);
            throw new BusinessException(UserErrorCode.SMS_SEND_FAILED);
        }
    }
}
