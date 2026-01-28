package org.example.backend.payment.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.order.entity.Order;
import org.example.backend.order.repository.OrderRepository;
import org.example.backend.payment.adapter.PaymentAdapter;
import org.example.backend.payment.dto.TossPaymentDto;
import org.example.backend.payment.entity.Payment;
import org.example.backend.payment.enums.PaymentMethod;
import org.example.backend.payment.enums.PaymentStatus;
import org.example.backend.payment.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentService {

    private final PaymentAdapter paymentAdapter;
    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;

    @Transactional
    public Payment confirmPayment(String paymentKey, String orderNo, Long amount) {
        // 1. 주문 조회 (orderNo로 조회)
        Order order = orderRepository.findByOrderNo(orderNo)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 주문입니다."));

        // 2. 금액 검증 (중요)
        if (order.getTotalAmount().longValue() != amount) {
            throw new IllegalArgumentException("결제 금액이 일치하지 않습니다.");
        }

        // 3. Toss 결제 승인 요청
        TossPaymentDto.PaymentConfirmResponse response = paymentAdapter.confirmPayment(paymentKey, orderNo, amount);

        // 4. 결제 정보 저장
        Payment payment = Payment.builder()
                .orderId(order.getId()) // DB FK는 여전히 ID 사용
                .paymentKey(paymentKey)
                .amount(BigDecimal.valueOf(response.getTotalAmount()))
                .status(PaymentStatus.DONE)
                .method(convertPaymentMethod(response.getMethod()))
                .paidAt(LocalDateTime.parse(response.getApprovedAt(),
                        java.time.format.DateTimeFormatter.ISO_OFFSET_DATE_TIME))
                .build();

        paymentRepository.save(payment);

        return payment;
    }

    @Transactional
    public String issueBillingKey(String authKey, String customerKey, Long userId) {
        // 1. Toss 빌링키 발급 요청
        TossPaymentDto.BillingKeyResponse response = paymentAdapter.issueBillingKey(authKey, customerKey);

        // 2. 빌링키 저장 (User 엔티티 or Subscription 엔티티)
        // Subscription 생성 시점에 저장되거나, User에 카드 정보 등록용으로 저장
        // 현재 설계상 Subscription에 billingKey가 있으므로, 여기서는 리턴만 하거나 User에 저장

        return response.getBillingKey();
    }

    @Transactional
    public Payment billingPayment(String billingKey, String customerKey, Long amount, Long orderId) {
        // 1. 주문 조회 및 검증
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 주문입니다."));

        // 2. Toss 자동 결제 요청
        TossPaymentDto.PaymentConfirmResponse response = paymentAdapter.billingPayment(billingKey, customerKey, amount,
                String.valueOf(orderId), order.getName());

        // 3. 결제 정보 저장
        Payment payment = Payment.builder()
                .orderId(orderId)
                .paymentKey(response.getPaymentKey())
                .amount(BigDecimal.valueOf(response.getTotalAmount()))
                .status(PaymentStatus.DONE)
                .method(PaymentMethod.CARD) // 자동결제는 대부분 CARD
                .paidAt(LocalDateTime.parse(response.getApprovedAt()))
                .build();

        return paymentRepository.save(payment);
    }

    // Toss Payments 한글 응답값을 Enum으로 변환
    private PaymentMethod convertPaymentMethod(String tossMethod) {
        return switch (tossMethod) {
            case "카드" -> PaymentMethod.CARD;
            case "가상계좌" -> PaymentMethod.VIRTUAL_ACCOUNT;
            case "토스페이" -> PaymentMethod.TOSS_PAY;
            default -> {
                log.warn("알 수 없는 결제 수단: {}", tossMethod);
                yield PaymentMethod.CARD; // 기본값
            }
        };
    }
}
