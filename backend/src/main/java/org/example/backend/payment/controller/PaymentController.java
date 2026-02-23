package org.example.backend.payment.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.payment.config.TossPaymentConfig;
import org.example.backend.payment.dto.response.PaymentConfigResponse;
import org.example.backend.payment.entity.Payment;
import org.example.backend.payment.service.PaymentService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.example.backend.global.security.details.PrincipalDetails;

import org.example.backend.order.entity.Order;
import org.example.backend.order.repository.OrderRepository;
import org.example.backend.subscription.service.SubscriptionService;

@Slf4j
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final SubscriptionService subscriptionService;
    private final OrderRepository orderRepository;
    private final TossPaymentConfig tossPaymentConfig;

    @Value("${payment.frontend-url}")
    private String frontendUrl;

    @Value("${payment.shipping-fee:3000}")
    private Long shippingFee;

    @GetMapping("/config")
    public ResponseEntity<PaymentConfigResponse> getConfig() {
        return ResponseEntity.ok(new PaymentConfigResponse(
                tossPaymentConfig.getClientKey(),
                tossPaymentConfig.getSuccessUrl(),
                tossPaymentConfig.getFailUrl(),
                shippingFee));
    }

    @GetMapping("/toss/success")
    public ResponseEntity<Void> handleTossSuccess(
            @RequestParam(required = false) String paymentKey,
            @RequestParam(required = false) String orderId,
            @RequestParam(required = false) Long amount,
            @RequestParam(required = false) String authKey,
            @RequestParam(required = false) String customerKey,
            @RequestParam(required = false) String orderNo,
            @RequestParam(required = false) Long productId) {

        try {
            if (paymentKey != null) {
                // 일반 결제 승인 (orderId 파라미터에 주문 번호 전달됨)
                Payment payment = paymentService.confirmPayment(paymentKey, orderId, amount);
                String redirectUrl = String.format(
                                "%s/payment/success?status=SUCCESS&orderNo=%s&orderId=%s&amount=%d",
                                frontendUrl, payment.getOrderNo(), payment.getOrderId(),
                                payment.getAmount().longValue());
                return ResponseEntity.status(302).header("Location", redirectUrl).build();

            } else if (authKey != null && customerKey != null) {
                // 2. 정기 결제 빌링키 발급 및 첫 결제
                if (orderNo == null || productId == null) {
                    throw new IllegalArgumentException("필수 파라미터 누락 (orderNo, productId)");
                }

                // orderNo로 유저 식별 (인증 헤더가 없으므로)
                Order order = orderRepository.findByOrderNo(orderNo)
                                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다."));

                subscriptionService.createCashSubscription(order.getUserId(), productId, authKey,
                                customerKey, orderNo);

                String redirectUrl = String.format(
                                "%s/payment/success?status=SUCCESS&orderNo=%s&isCandy=false",
                                frontendUrl, orderNo);
                return ResponseEntity.status(302).header("Location", redirectUrl).build();
            } else {
                throw new IllegalArgumentException("잘못된 요청입니다.");
            }

        } catch (Exception e) {
            log.error("Payment Confirmation Failed", e);
            String message = e.getMessage() != null ? e.getMessage() : "결제 처리 중 오류가 발생했습니다.";
            // URL 인코딩 필요할 수 있음 (간단히 처리)
            try {
                String encodedMessage = java.net.URLEncoder.encode(message, "UTF-8");
                String failRedirectUrl = String.format("%s/payment/fail?code=ERROR&message=%s",
                                frontendUrl, encodedMessage);
                return ResponseEntity.status(302).header("Location", failRedirectUrl).build();
            } catch (java.io.UnsupportedEncodingException ex) {
                log.error("URL Encoding Failed", ex);
                return ResponseEntity.internalServerError().build();
            }
        }
    }

    @GetMapping("/toss/fail")
    public ResponseEntity<Void> failPayment(
            @RequestParam String code,
            @RequestParam String message,
            @RequestParam String orderId) {

        paymentService.handlePaymentFailure(code, message, orderId);

        try {
                String encodedMessage = java.net.URLEncoder.encode(message, "UTF-8");
                String encodedCode = java.net.URLEncoder.encode(code, "UTF-8");

                String failRedirectUrl = String.format("%s/payment/fail?code=%s&message=%s&orderId=%s",
                                frontendUrl, encodedCode, encodedMessage, orderId);

                return ResponseEntity.status(302).header("Location", failRedirectUrl).build();
        } catch (java.io.UnsupportedEncodingException e) {
                log.error("URL Encoding Failed", e);
                return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/my")
    public ResponseEntity<java.util.List<Payment>> getMyPayments(
            @AuthenticationPrincipal PrincipalDetails principal) {
        return ResponseEntity.ok(paymentService.getMyPayments(principal.getUser().getId()));
    }
}
