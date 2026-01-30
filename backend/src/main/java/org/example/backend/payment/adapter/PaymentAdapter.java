package org.example.backend.payment.adapter;

import org.example.backend.payment.dto.TossPaymentDto;

public interface PaymentAdapter {
    TossPaymentDto.PaymentConfirmResponse confirmPayment(String paymentKey, String orderId, Long amount);

    TossPaymentDto.BillingKeyResponse issueBillingKey(String authKey, String customerKey);

    TossPaymentDto.PaymentConfirmResponse billingPayment(String billingKey, String customerKey, Long amount,
            String orderId, String orderName);
}
