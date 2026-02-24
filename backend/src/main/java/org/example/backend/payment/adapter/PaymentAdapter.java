package org.example.backend.payment.adapter;

import org.example.backend.payment.dto.PaymentConfirmResult;
import org.example.backend.payment.dto.PaymentStatusResponse;

/**
 * PG사에 종속되지 않는 결제 어댑터 인터페이스.
 * 구현체(TossPaymentAdapter 등)가 각 PG API를 호출하고 도메인 모델로 변환하여 반환한다.
 */
public interface PaymentAdapter {
    PaymentConfirmResult confirmPayment(String paymentKey, String orderId, Long amount);

    String issueBillingKey(String authKey, String customerKey);

    PaymentConfirmResult billingPayment(String billingKey, String customerKey, Long amount,
            String orderId, String orderName);

    /**
     * 주문 번호로 PG사의 결제 상태를 조회합니다.
     */
    PaymentStatusResponse getPaymentStatus(String orderNo);
}
