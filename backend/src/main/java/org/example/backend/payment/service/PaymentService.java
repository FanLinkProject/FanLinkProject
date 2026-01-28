package org.example.backend.payment.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.order.entity.Order;
import org.example.backend.order.enums.OrderStatus;
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
    public Payment confirmPayment(String paymentKey, String orderIdStr, Long amount) {
        // 1. 주문 조회
        Long orderId = Long.parseLong(orderIdStr); // 실제로는 orderId 구조에 따라 파싱 로직 상이할 수 있음
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 주문입니다."));

        // 2. 금액 검증 (중요)
        if (order.getTotalAmount().longValue() != amount) {
            throw new IllegalArgumentException("결제 금액이 일치하지 않습니다.");
        }

        // 3. Toss 결제 승인 요청
        TossPaymentDto.PaymentConfirmResponse response = paymentAdapter.confirmPayment(paymentKey, orderIdStr, amount);

        // 4. 결제 정보 저장
        Payment payment = Payment.builder()
                .orderId(orderId)
                .paymentKey(paymentKey)
                .amount(BigDecimal.valueOf(response.getTotalAmount()))
                .status(PaymentStatus.DONE)
                .method(PaymentMethod.valueOf(response.getMethod())) // "CARD" -> Enum 매핑 필요 (주의: Toss 응답값과 Enum 일치 여부
                                                                     // 확인)
                .paidAt(LocalDateTime.parse(response.getApprovedAt())) // ISO_OFFSET_DATE_TIME 파싱 확인 필요
                .build();

        paymentRepository.save(payment);

        // 5. 주문 상태 업데이트 (추후 OrderService로 위임 가능)
        // order.complete(); // Order 엔티티에 비즈니스 메서드 추가 필요

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
}
