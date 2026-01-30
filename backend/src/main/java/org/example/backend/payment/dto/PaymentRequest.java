package org.example.backend.payment.dto;

import java.time.LocalDateTime;

/**
 * 결제 생성/수정 요청
 * 사용: PaymentController (POST /api/payments, PUT /api/payments/{id}), PaymentService.create, update
 * 단건: productId NOT NULL / 정기: subscriptionId NOT NULL (상호 배타)
 */
public record PaymentRequest(
        String paymentKey,
        String orderId,
        Long amount,
        String status,
        String paymentType,
        String orderName,
        LocalDateTime paidAt,
        Long userId,
        Long productId,
        Long subscriptionId
) {
}
