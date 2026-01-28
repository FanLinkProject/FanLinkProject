package org.example.backend.payment.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

public class TossPaymentDto {

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentConfirmRequest {
        private String paymentKey;
        private String orderId;
        private Long amount;
    }

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
