package org.example.backend.payment.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.order.entity.Order;
import org.example.backend.order.entity.OrderItem;
import org.example.backend.order.repository.OrderRepository;
import org.example.backend.payment.adapter.PaymentAdapter;
import org.example.backend.payment.dto.TossPaymentDto;
import org.example.backend.payment.entity.Payment;
import org.example.backend.payment.enums.PaymentMethod;
import org.example.backend.payment.enums.PaymentStatus;
import org.example.backend.payment.repository.PaymentRepository;
import org.example.backend.product.enums.ProductType;
import org.example.backend.settlement.event.PaymentCompletedEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.example.backend.product.repository.ProductRepository;
import org.example.backend.subscription.repository.SubscriptionRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.example.backend.payment.exception.PaymentErrorCode;
import org.example.backend.payment.exception.PaymentException;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentService {

    private final PaymentAdapter paymentAdapter;
    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final SubscriptionRepository subscriptionRepository;

    /**
     * 결제 승인 요청을 처리합니다. (단건 결제)
     * 결제 승인 후 이벤트를 발행하여 정산 데이터를 생성합니다.
     *
     * @param paymentKey Toss Payments 결제 키
     * @param orderNo    주문 번호
     * @param amount     결제 금액
     * @return 저장된 Payment 엔티티
     */
    @Transactional(noRollbackFor = PaymentException.class)
    public Payment confirmPayment(String paymentKey, String orderNo, Long amount) {
        // 1. 주문 조회 (orderNo로 조회)
        Order order = orderRepository.findByOrderNo(orderNo)
                .orElseThrow(() -> new PaymentException(PaymentErrorCode.ORDER_NOT_FOUND));

        // 2. 금액 검증 (중요)
        if (order.getTotalAmount().longValue() != amount) {
            throw new PaymentException(PaymentErrorCode.PAYMENT_AMOUNT_MISMATCH);
        }

        TossPaymentDto.PaymentConfirmResponse response;
        try {
            // 3. Toss 결제 승인 요청
            response = paymentAdapter.confirmPayment(paymentKey, orderNo, amount);

            // 결제 성공 시 주문 상태 변경
            order.updateStatus(org.example.backend.order.enums.OrderStatus.COMPLETED);
            orderRepository.save(order);
        } catch (Exception e) {
            // 결제 실패 시 주문 상태 변경 (FAILED)
            order.updateStatus(org.example.backend.order.enums.OrderStatus.FAILED);
            orderRepository.save(order);
            // 원인 예외를 로그로 남기고 PaymentException 던짐
            log.error("Payment Confirmation Failed: {}", e.getMessage(), e);
            throw new PaymentException(PaymentErrorCode.PAYMENT_CONFIRM_FAILED);
        }

        // 4. 결제 정보 저장
        Payment payment = Payment.builder()
                .userId(order.getUserId()) // User ID 설정
                .orderId(order.getId()) // DB FK는 여전히 ID 사용
                .paymentKey(paymentKey)
                .amount(BigDecimal.valueOf(response.getTotalAmount()))
                .status(PaymentStatus.DONE)
                .method(convertPaymentMethod(response.getMethod()))
                .paidAt(LocalDateTime.parse(response.getApprovedAt(),
                        java.time.format.DateTimeFormatter.ISO_OFFSET_DATE_TIME))
                .build();

        Payment savedPayment = paymentRepository.save(payment);

        // 5. 후속 처리 (캔디 충전 등)
        processPostPaymentActions(order);

        // 6. 결제 완료 이벤트 발행 (정산 처리를 위해)
        eventPublisher.publishEvent(new PaymentCompletedEvent(this, savedPayment, order));

        return savedPayment;
    }

    /**
     * 발급된 빌링키를 사용하여 정기 결제를 수행합니다.
     * 스케줄러에 의해 주기적으로 호출됩니다.
     *
     * @param billingKey  발급받은 빌링키
     * @param customerKey 고객 식별 키
     * @param amount      결제 금액
     * @param orderId     주문 ID (구독 갱신 시에는 가상의 ID 사용 가능)
     * @return 결제 완료된 Payment 정보
     */
    @Transactional(noRollbackFor = PaymentException.class)
    public Payment billingPayment(String billingKey, String customerKey, Long amount, Long orderId) {
        // 1. 주문 조회 및 검증
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new PaymentException(PaymentErrorCode.ORDER_NOT_FOUND));

        TossPaymentDto.PaymentConfirmResponse response;
        try {
            // 2. Toss 자동 결제 요청
            response = paymentAdapter.billingPayment(billingKey, customerKey, amount,
                    String.valueOf(orderId), order.getName());

            // 결제 성공 시 주문 상태 변경
            order.updateStatus(org.example.backend.order.enums.OrderStatus.COMPLETED);
            orderRepository.save(order);
        } catch (Exception e) {
            // 결제 실패 시 주문 상태 변경 (FAILED)
            order.updateStatus(org.example.backend.order.enums.OrderStatus.FAILED);
            orderRepository.save(order);
            // 원인 예외 로그
            log.error("Billing Payment Failed: {}", e.getMessage(), e);
            throw new PaymentException(PaymentErrorCode.BILLING_PAYMENT_FAILED);
        }

        // 3. 결제 정보 저장
        Payment payment = Payment.builder()
                .userId(order.getUserId()) // User ID 설정
                .orderId(orderId)
                .paymentKey(response.getPaymentKey())
                .amount(BigDecimal.valueOf(response.getTotalAmount()))
                .status(PaymentStatus.DONE)
                .method(PaymentMethod.CARD) // 자동결제는 대부분 CARD
                .paidAt(LocalDateTime.parse(response.getApprovedAt()))
                .build();

        Payment savedPayment = paymentRepository.save(payment);

        // 4. 후속 처리 (캔디 충전 등)
        processPostPaymentActions(order);

        // 5. 결제 완료 이벤트 발행 (정산 처리를 위해)
        eventPublisher.publishEvent(new PaymentCompletedEvent(this, savedPayment, order));

        return savedPayment;
    }

    /**
     * 결제 성공 후 후속 처리를 수행합니다.
     * 예: CASH 타입 상품 구매 시 캔디 충전
     */
    private void processPostPaymentActions(Order order) {
        for (OrderItem item : order.getOrderItems()) {
            if (item.getProduct().getType() == ProductType.CASH) {
                // 충전량 계산 규칙: 100원당 1캔디
                long candyAmount = item.getPrice().longValue() / 100 * item.getQuantity();

                // 유저 조회 후 충전
                User user = userRepository.findById(order.getUserId())
                        .orElseThrow(() -> new PaymentException(PaymentErrorCode.USER_NOT_FOUND));
                user.chargeCandy(candyAmount);

                log.info("캔디 충전 완료: userId={}, amount={}", user.getId(), candyAmount);
            }
        }
    }



    /**
     * 내 결제 내역을 조회합니다.
     *
     * @param userId 유저 ID
     * @return 결제 내역 목록
     */
    public java.util.List<Payment> getMyPayments(Long userId) {
        return paymentRepository.findAllByUserId(userId);
    }

    /**
     * 캔디 결제(전액 캔디 사용)에 대한 Payment 기록을 생성합니다.
     * PG사를 통하지 않는 내부 결제.
     */
    @Transactional
    public Payment createCandyPayment(Order order) {
        // 캔디 결제는 금액(amount)을 원화 가치로 환산하여 저장 (1캔디 = 100원 기준)
        long krwAmount = order.getTotalCandyAmount() * 100L;

        Payment payment = Payment.builder()
                .userId(order.getUserId())
                .orderId(order.getId())
                .paymentKey("CANDY_" + java.util.UUID.randomUUID().toString())
                .amount(BigDecimal.valueOf(krwAmount))
                .status(PaymentStatus.DONE)
                .method(PaymentMethod.CANDY) // ENUM에 CANDY 확인 필요, 없으면 CARD 등 대체
                .paidAt(LocalDateTime.now())
                .build();

        Payment savedPayment = paymentRepository.save(payment);

        // 이벤트 발행
        eventPublisher.publishEvent(new PaymentCompletedEvent(this, savedPayment, order));

        return savedPayment;
    }

    /**
     * 빌링키를 발급받습니다.
     *
     * @param authKey     인증 키
     * @param customerKey 고객 키
     * @return 발급된 빌링키
     */
    public String issueBillingKey(String authKey, String customerKey) {
        return paymentAdapter.issueBillingKey(authKey, customerKey).getBillingKey();
    }

    /**
     * Toss Payments 한글 응답값을 Enum으로 변환
     */
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
