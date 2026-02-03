package org.example.backend.user.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.user.dto.request.EmailVerificationCodeRequest;
import org.example.backend.user.dto.request.EmailVerificationRequest;
import org.example.backend.user.dto.request.PhoneVerificationCodeRequest;
import org.example.backend.user.dto.request.PhoneVerificationRequest;
import org.example.backend.user.dto.response.VerificationResponse;
import org.example.backend.user.service.EmailService;
import org.example.backend.user.service.SmsService;
import org.example.backend.user.service.VerificationCodeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/verification")
@RequiredArgsConstructor
public class VerificationController {

    private final VerificationCodeService verificationCodeService;
    private final EmailService emailService;
    private final SmsService smsService;

    // 이메일 인증 코드 발송
    @PostMapping("/email/send")
    public ResponseEntity<VerificationResponse> sendEmailCode(
            @Valid @RequestBody EmailVerificationRequest request
    ) {
        // 인증 코드 생성
        String code = verificationCodeService.generateCode();
        
        // Redis에 저장 (5분 유효)
        verificationCodeService.saveEmailCode(request.email(), code);
        
        // 이메일 발송
        emailService.sendVerificationCode(request.email(), code);
        
        return ResponseEntity.ok(VerificationResponse.success("이메일"));
    }

    // 이메일 인증 코드 검증
    @PostMapping("/email/verify")
    public ResponseEntity<VerificationResponse> verifyEmailCode(
            @Valid @RequestBody EmailVerificationCodeRequest request
    ) {
        boolean isValid = verificationCodeService.verifyEmailCode(
                request.email(),
                request.code()
        );
        
        if (isValid) {
            return ResponseEntity.ok(new VerificationResponse("이메일 인증이 완료되었습니다."));
        } else {
            return ResponseEntity.badRequest()
                    .body(new VerificationResponse("인증 코드가 일치하지 않거나 만료되었습니다."));
        }
    }

    // 전화번호 인증번호 발송
    @PostMapping("/phone/send")
    public ResponseEntity<VerificationResponse> sendPhoneCode(
            @Valid @RequestBody PhoneVerificationRequest request
    ) {
        // 인증번호 생성
        String code = verificationCodeService.generateCode();
        
        // Redis에 저장 (5분 유효)
        verificationCodeService.savePhoneCode(request.phoneNumber(), code);
        
        // SMS 발송
        smsService.sendVerificationCode(request.phoneNumber(), code);
        
        return ResponseEntity.ok(VerificationResponse.success("전화번호"));
    }

    // 전화번호 인증번호 검증
    @PostMapping("/phone/verify")
    public ResponseEntity<VerificationResponse> verifyPhoneCode(
            @Valid @RequestBody PhoneVerificationCodeRequest request
    ) {
        boolean isValid = verificationCodeService.verifyPhoneCode(
                request.phoneNumber(),
                request.code()
        );
        
        if (isValid) {
            return ResponseEntity.ok(new VerificationResponse("전화번호 인증이 완료되었습니다."));
        } else {
            return ResponseEntity.badRequest()
                    .body(new VerificationResponse("인증번호가 일치하지 않거나 만료되었습니다."));
        }
    }
}
