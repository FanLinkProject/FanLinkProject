package org.example.backend.payment.dto.response;

public record PaymentConfigResponse(
        String clientKey,
        String successUrl,
        String failUrl,
        Long shippingFee) {
}
