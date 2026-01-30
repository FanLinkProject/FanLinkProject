package org.example.backend.payment.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.payment.config.TossPaymentConfig;
import org.example.backend.payment.dto.response.PaymentConfigResponse;
import org.example.backend.payment.entity.Payment;
import org.example.backend.payment.service.PaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final TossPaymentConfig tossPaymentConfig;

    @GetMapping("/config")
    public ResponseEntity<PaymentConfigResponse> getConfig() {
        return ResponseEntity.ok(new PaymentConfigResponse(
                tossPaymentConfig.getClientKey(),
                tossPaymentConfig.getBaseUrl() + "/success",
                tossPaymentConfig.getBaseUrl() + "/fail"));
    }

    @GetMapping("/confirm")
    public ResponseEntity<Payment> confirmPayment(
            @RequestParam String paymentKey,
            @RequestParam String orderId,
            @RequestParam Long amount) {

        Payment payment = paymentService.confirmPayment(paymentKey, orderId, amount);
        return ResponseEntity.ok(payment);
    }
}
