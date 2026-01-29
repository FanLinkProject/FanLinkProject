package org.example.backend.payment.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

public class TossPaymentDto {

    /**
     * 결제 승인 요청 DTO
     * (프론트엔드 -> 백엔드 -> Toss API)
     */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentConfirmRequest {
        private String paymentKey;
        private String orderId;
        private Long amount;
    }

    /**
     * 결제 승인 응답 DTO
     * (Toss API -> 백엔드 -> 서비스 로직)
     */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentConfirmResponse {
        private String paymentKey;
        private String orderId;
        private String orderName;
        private String status;
        private String method; // "카드", "간편결제", etc.
        private String requestedAt;
        private String approvedAt;
        private Card card;
        private EasyPay easyPay;
        private String type; // NORMAL, BILLING, etc.
        private Long totalAmount;
    }

    /**
     * 빌링키 발급 요청 DTO
     * authKey는 위젯에서 받은 1회용 인증 키입니다.
     */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BillingKeyRequest {
        private String authKey;
        private String customerKey;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BillingKeyResponse {
        private String mId;
        private String customerKey;
        private String authenticatedAt;
        private String method; // "CARD"
        private String billingKey;
        private Card card;
    }

    /**
     * 빌링키 결제 요청 DTO (자동 결제)
     * billingKey는 URL Path Variable로 전달되므로 여기에 포함되지 않습니다.
     */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BillingPaymentRequest {
        private String customerKey;
        private Long amount;
        private String orderId;
        private String orderName;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Card {
        private String company;
        private String number;
        private String ownerType; // 개인, 법인
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EasyPay {
        private String provider;
        private Long amount;
        private Long discountAmount;
    }
}
