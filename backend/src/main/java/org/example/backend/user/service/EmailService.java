package org.example.backend.user.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.global.exception.BusinessException;
import org.example.backend.user.exception.UserErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    // 이메일 인증 코드 발송
    public void sendVerificationCode(String toEmail, String code) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("[FanLink] 이메일 인증 코드");
            message.setText(
                    "안녕하세요. FanLink입니다.\n\n" +
                    "인증 코드: " + code + "\n\n" +
                    "이 코드는 5분간 유효합니다.\n"
            );

            mailSender.send(message);
            log.info("이메일 인증 코드 발송 완료: {}", toEmail);
        } catch (Exception e) {
            log.error("이메일 발송 실패: {}", toEmail, e);
            throw new BusinessException(UserErrorCode.EMAIL_SEND_FAILED);
        }
    }
}
