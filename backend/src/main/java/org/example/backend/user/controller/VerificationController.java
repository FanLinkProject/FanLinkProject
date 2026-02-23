package org.example.backend.user.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.BusinessException;
import org.example.backend.user.dto.request.EmailVerificationCodeRequest;
import org.example.backend.user.dto.request.EmailVerificationRequest;
import org.example.backend.user.dto.request.PhoneVerificationCodeRequest;
import org.example.backend.user.dto.request.PhoneVerificationRequest;
import org.example.backend.user.dto.response.VerificationResponse;
import org.example.backend.user.exception.UserErrorCode;
import org.example.backend.user.service.EmailService;
import org.example.backend.user.service.RateLimitService;
import org.example.backend.user.service.SmsService;
import org.example.backend.user.service.VerificationCodeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/verification")
@RequiredArgsConstructor
public class VerificationController {

    private static final int SEND_LIMIT_PER_HOUR = 5;
    private static final int VERIFY_LIMIT_PER_10_MIN = 10;
    private static final Duration SEND_WINDOW = Duration.ofHours(1);
    private static final Duration VERIFY_WINDOW = Duration.ofMinutes(10);

    private final VerificationCodeService verificationCodeService;
    private final EmailService emailService;
    private final SmsService smsService;
    private final RateLimitService rateLimitService;

    @PostMapping("/email/send")
    public ResponseEntity<VerificationResponse> sendEmailCode(
            @Valid @RequestBody EmailVerificationRequest request
    ) {
        String email = normalizeEmail(request.email());
        enforceRateLimit("verification:email:send:" + email, SEND_LIMIT_PER_HOUR, SEND_WINDOW);

        String code = verificationCodeService.generateCode();
        verificationCodeService.saveEmailCode(email, code);
        emailService.sendVerificationCode(email, code);

        return ResponseEntity.ok(VerificationResponse.success("Email verification code sent."));
    }

    @PostMapping("/email/verify")
    public ResponseEntity<VerificationResponse> verifyEmailCode(
            @Valid @RequestBody EmailVerificationCodeRequest request
    ) {
        String email = normalizeEmail(request.email());
        enforceRateLimit("verification:email:verify:" + email, VERIFY_LIMIT_PER_10_MIN, VERIFY_WINDOW);

        boolean isValid = verificationCodeService.verifyEmailCode(email, request.code());
        if (isValid) {
            return ResponseEntity.ok(new VerificationResponse("Email verification completed."));
        }

        return ResponseEntity.badRequest()
                .body(new VerificationResponse("Invalid or expired verification code."));
    }

    @PostMapping("/phone/send")
    public ResponseEntity<VerificationResponse> sendPhoneCode(
            @Valid @RequestBody PhoneVerificationRequest request
    ) {
        String phone = normalizePhone(request.phoneNumber());
        enforceRateLimit("verification:phone:send:" + phone, SEND_LIMIT_PER_HOUR, SEND_WINDOW);

        String code = verificationCodeService.generateCode();
        smsService.sendVerificationCode(phone, code);
        verificationCodeService.savePhoneCode(phone, code);

        return ResponseEntity.ok(VerificationResponse.success("Phone verification code sent."));
    }

    @PostMapping("/phone/verify")
    public ResponseEntity<VerificationResponse> verifyPhoneCode(
            @Valid @RequestBody PhoneVerificationCodeRequest request
    ) {
        String phone = normalizePhone(request.phoneNumber());
        enforceRateLimit("verification:phone:verify:" + phone, VERIFY_LIMIT_PER_10_MIN, VERIFY_WINDOW);

        boolean isValid = verificationCodeService.checkPhoneCode(phone, request.code());
        if (isValid) {
            return ResponseEntity.ok(new VerificationResponse("Phone verification completed."));
        }

        return ResponseEntity.badRequest()
                .body(new VerificationResponse("Invalid or expired verification code."));
    }

    private void enforceRateLimit(String key, int limit, Duration window) {
        if (!rateLimitService.tryAcquire(key, limit, window)) {
            throw new BusinessException(UserErrorCode.TOO_MANY_REQUESTS);
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private String normalizePhone(String phoneNumber) {
        return phoneNumber == null ? "" : phoneNumber.replaceAll("[^0-9]", "");
    }
}
