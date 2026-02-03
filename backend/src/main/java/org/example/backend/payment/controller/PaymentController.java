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

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.example.backend.global.security.details.PrincipalDetails;

@Slf4j
@RestController
@RequestMapping("/api/payments")
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

    @GetMapping("/fail")
    public ResponseEntity<String> failPayment(
            @RequestParam String code,
            @RequestParam String message,
            @RequestParam String orderId) { // Tosspayments는 orderId 파라미터로 주문번호를 전달함

        paymentService.handlePaymentFailure(code, message, orderId);
        return ResponseEntity.ok("결제 실패 처리 완료: " + message);
    }

    @GetMapping("/my")
    public ResponseEntity<java.util.List<Payment>> getMyPayments(
            @AuthenticationPrincipal PrincipalDetails principal) {
        return ResponseEntity.ok(paymentService.getMyPayments(principal.getUser().getId()));
    }
}
