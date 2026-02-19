package org.example.backend.payment.dto;

import lombok.Builder;
import lombok.Getter;
import org.example.backend.payment.enums.PaymentMethod;

import java.time.Instant;

/**
 * PG사에 종속되지 않는 결제 승인 결과 도메인 모델.
 * 각 PG 어댑터(Toss, NicePay 등)가 자사 응답을 이 형태로 변환하여 반환한다.
 */
@Getter
@Builder
public class PaymentConfirmResult {
    private String paymentKey;      // PG사 결제 키 (외부 식별자)
    private Long amount;
    private PaymentMethod method;
    private Instant approvedAt;
}
