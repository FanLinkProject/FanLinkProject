package org.example.backend.user.dto.response;

// 인증 관련 응답 dto
public record VerificationResponse(
        String message
) {
    // 인증 코드 발송 성공 응답 생성
    public static VerificationResponse success(String type) {
        return new VerificationResponse(type + " 인증 코드가 성공적으로 발송되었습니다.");
    }
}
