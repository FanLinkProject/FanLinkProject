package org.example.backend.user.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.nurigo.sdk.NurigoApp;
import net.nurigo.sdk.message.model.Message;
import net.nurigo.sdk.message.service.DefaultMessageService;
import org.example.backend.global.exception.BusinessException;
import org.example.backend.user.exception.UserErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@RequiredArgsConstructor
public class SmsService {

    @Value("${spring.sms.api.enabled:${sms.api.enabled:false}}")
    private boolean smsApiEnabled;

    @Value("${spring.mail.dev-mode:${mail.dev-mode:true}}")
    private boolean mailDevMode;

    @Value("${spring.sms.api.key:${sms.api.key:}}")
    private String apiKey;

    @Value("${spring.sms.api.secret:${sms.api.secret:}}")
    private String apiSecret;

    @Value("${spring.sms.api.from:${sms.api.from:}}")
    private String fromNumber;

    private DefaultMessageService messageService;

    // CoolSMS SDK 초기화
    @PostConstruct
    public void init() {
        if (!smsApiEnabled) {
            log.info("SMS 개발 모드: 실제 SMS 발송 없이 로그만 출력합니다.");
            if (!mailDevMode) {
                log.info("개발 모드: spring.mail.dev-mode와 spring.sms.api.enabled가 모두 false입니다.");
            }
            return;
        }

        if (!StringUtils.hasText(apiKey) || !StringUtils.hasText(apiSecret)) {
            log.warn("spring.sms.api.enabled=true 이지만 SMS API key/secret이 비어 있습니다. 개발 모드로 동작합니다.");
            smsApiEnabled = false;
            return;
        }

        this.messageService = NurigoApp.INSTANCE.initialize(apiKey, apiSecret, "https://api.coolsms.co.kr");
        log.info("CoolSMS 초기화 완료");

        if (!StringUtils.hasText(fromNumber)) {
            log.warn("spring.sms.api.from 값이 비어 있습니다. 실제 SMS 발송 시 실패할 수 있습니다.");
        }
    }

    // 전화번호로 인증번호 발송
    public void sendVerificationCode(String phoneNumber, String code) {
        try {
            if (!smsApiEnabled) {
                log.info("=== SMS 인증번호 발송 (개발 모드) ===");
                log.info("수신자: {}", phoneNumber);
                log.info("인증번호: {}", code);
                if (!mailDevMode) {
                    log.info("개발 모드: spring.mail.dev-mode와 spring.sms.api.enabled가 모두 false입니다.");
                } else {
                    log.info("실제 SMS 발송을 위해서는 spring.sms.api.enabled=true 설정과 API 키가 필요합니다.");
                }
                return;
            }

            if (messageService == null) {
                log.error("SMS 서비스가 초기화되지 않았습니다. SMS 설정을 확인하세요.");
                throw new BusinessException(UserErrorCode.SMS_SEND_FAILED);
            }

            sendSmsViaApi(phoneNumber, code);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("SMS 발송 실패: {}", phoneNumber, e);
            throw new BusinessException(UserErrorCode.SMS_SEND_FAILED);
        }
    }

    // CoolSMS API를 통한 실제 SMS 발송
    private void sendSmsViaApi(String phoneNumber, String code) {
        if (messageService == null || !StringUtils.hasText(fromNumber)) {
            throw new BusinessException(UserErrorCode.SMS_SEND_FAILED);
        }

        try {
            String cleanPhoneNumber = phoneNumber == null ? "" : phoneNumber.replaceAll("[^0-9]", "");
            String cleanFromNumber = fromNumber.replaceAll("[^0-9]", "");
            if (!StringUtils.hasText(cleanPhoneNumber) || !StringUtils.hasText(cleanFromNumber)) {
                throw new BusinessException(UserErrorCode.SMS_SEND_FAILED);
            }

            Message message = new Message();
            message.setFrom(cleanFromNumber);
            message.setTo(cleanPhoneNumber);
            message.setText("[FanLink] 인증번호: " + code);

            messageService.send(message);
            log.info("SMS 인증번호 발송 완료: {}", cleanPhoneNumber);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("CoolSMS 발송 실패: {}", phoneNumber, e);
            throw new BusinessException(UserErrorCode.SMS_SEND_FAILED);
        }
    }
}