package org.example.backend.payment.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.order.entity.Order;
import org.example.backend.order.entity.OrderItem;
import org.example.backend.order.repository.OrderRepository;
import org.example.backend.payment.adapter.PaymentAdapter;
import org.example.backend.payment.dto.PaymentConfirmResult;
import org.example.backend.payment.entity.Payment;
import org.example.backend.payment.enums.PaymentMethod;
import org.example.backend.payment.enums.PaymentStatus;
import org.example.backend.payment.repository.PaymentRepository;
import org.example.backend.product.enums.ProductType;
import org.example.backend.settlement.event.PaymentCompletedEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.example.backend.order.enums.OrderStatus;

import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;

import java.math.BigDecimal;
import java.time.Instant;

import org.example.backend.payment.exception.PaymentErrorCode;
import org.example.backend.payment.exception.PaymentException;
import org.example.backend.payment.config.PaymentExchangeConfig;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentService {

    private static final int PAYMENT_SAVE_MAX_RETRIES = 3;
    private static final long RETRY_DELAY_MS = 500;

    private final PaymentAdapter paymentAdapter;
    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final UserRepository userRepository;

    /**
     * 결제 승인 요청을 처리합니다. (단건 결제)
     * 결제 승인 후 이벤트를 발행하여 정산 데이터를 생성합니다.
     * - 멱등성: 동일 orderNo로 이미 Payment가 있으면 기존 반환
     * - 재시도: DB 저장 실패 시 최대 3회 재시도 (exponential backoff)
     *
     * @param paymentKey PG사 결제 키
     * @param orderNo    주문 번호
     * @param amount     결제 금액
     * @return 저장된 Payment 엔티티
     */
    @Transactional(noRollbackFor = PaymentException.class)
    public Payment confirmPayment(String paymentKey, String orderNo, Long amount) {
        log.info("[confirmPayment] 시작: orderNo={}, paymentKey={}, amount={}", orderNo, maskPaymentKey(paymentKey), amount);

        // 0. 멱등성: 이미 저장된 결제가 있으면 기존 반환
        var existingPayment = paymentRepository.findByOrderNo(orderNo);
        if (existingPayment.isPresent() && existingPayment.get().getStatus() == PaymentStatus.DONE) {
            log.info("[confirmPayment] 멱등: 기존 Payment 반환 orderNo={}, paymentId={}", orderNo, existingPayment.get().getId());
            return existingPayment.get();
        }

        // 1. 주문 조회 (orderNo로 조회)
        Order order = orderRepository.findByOrderNo(orderNo)
                .orElseThrow(() -> {
                    log.error("[confirmPayment] 주문 없음: orderNo={}", orderNo);
                    return new PaymentException(PaymentErrorCode.ORDER_NOT_FOUND);
                });
        log.debug("[confirmPayment] 주문 조회 완료: orderId={}, userId={}", order.getId(), order.getUserId());

        // 2. 금액 검증 (중요)
        if (order.getTotalAmount().longValue() != amount) {
            log.error("[confirmPayment] 금액 불일치: orderNo={}, expected={}, actual={}", orderNo, order.getTotalAmount(), amount);
            throw new PaymentException(PaymentErrorCode.PAYMENT_AMOUNT_MISMATCH);
        }

        PaymentConfirmResult result;
        try {
            // 3. PG 결제 승인 요청
            log.info("[confirmPayment] PG API 호출: orderNo={}", orderNo);
            result = paymentAdapter.confirmPayment(paymentKey, orderNo, amount);
            log.info("[confirmPayment] PG API 성공: orderNo={}, amount={}", orderNo, result.getAmount());
        } catch (Exception e) {
            log.error("[confirmPayment] PG API 실패: orderNo={}, error={}", orderNo, e.getMessage(), e);
            order.updateStatus(OrderStatus.FAILED);
            orderRepository.save(order);
            throw new PaymentException(PaymentErrorCode.PAYMENT_CONFIRM_FAILED);
        }

        // 4~6. DB 저장 및 후속 처리 (재시도 포함)
        return savePaymentAndProcessWithRetry(order, orderNo, result);
    }

    /**
     * PG 승인 결과를 DB에 저장하고 후속 처리를 수행합니다. (재시도 로직 포함)
     */
    private Payment savePaymentAndProcessWithRetry(Order order, String orderNo, PaymentConfirmResult result) {
        Exception lastException = null;
        for (int attempt = 1; attempt <= PAYMENT_SAVE_MAX_RETRIES; attempt++) {
            try {
                log.info("[confirmPayment] DB 저장 시도 {}/{}: orderNo={}", attempt, PAYMENT_SAVE_MAX_RETRIES, orderNo);

                // 멱등성 재확인 (재시도 중 다른 요청이 먼저 저장했을 수 있음)
                var existing = paymentRepository.findByOrderNo(orderNo);
                if (existing.isPresent() && existing.get().getStatus() == PaymentStatus.DONE) {
                    log.info("[confirmPayment] 재시도 중 멱등: 기존 Payment 반환 orderNo={}", orderNo);
                    return existing.get();
                }

                order.updateStatus(OrderStatus.COMPLETED);
                orderRepository.save(order);
                log.debug("[confirmPayment] Order COMPLETED 저장 완료: orderNo={}", orderNo);

                Payment payment = Payment.builder()
                        .userId(order.getUserId())
                        .orderId(order.getId())
                        .orderNo(orderNo)
                        .paymentKey(result.getPaymentKey())
                        .amount(BigDecimal.valueOf(result.getAmount()))
                        .status(PaymentStatus.DONE)
                        .method(result.getMethod())
                        .paidAt(result.getApprovedAt())
                        .build();

                Payment savedPayment = paymentRepository.save(payment);
                log.info("[confirmPayment] Payment 저장 완료: orderNo={}, paymentId={}", orderNo, savedPayment.getId());

                processPostPaymentActions(order);
                eventPublisher.publishEvent(new PaymentCompletedEvent(this, savedPayment, order));

                return savedPayment;
            } catch (Exception e) {
                lastException = e;
                log.warn("[confirmPayment] DB 저장 실패 (시도 {}/{}): orderNo={}, error={}", attempt, PAYMENT_SAVE_MAX_RETRIES, orderNo, e.getMessage(), e);
                if (attempt < PAYMENT_SAVE_MAX_RETRIES) {
                    try {
                        long delay = RETRY_DELAY_MS * (1L << (attempt - 1));
                        Thread.sleep(delay);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new PaymentException(PaymentErrorCode.PAYMENT_CONFIRM_FAILED);
                    }
                }
            }
        }
        log.error("[confirmPayment] DB 저장 최종 실패: orderNo={}, paymentKey={}, 수동 복구 필요", orderNo, maskPaymentKey(result.getPaymentKey()), lastException);
        throw new PaymentException(PaymentErrorCode.PAYMENT_CONFIRM_FAILED);
    }

    private static String maskPaymentKey(String key) {
        if (key == null || key.length() < 8) return "***";
        return key.substring(0, 4) + "***" + key.substring(key.length() - 4);
    }

    /**
     * 발급된 빌링키를 사용하여 정기 결제를 수행합니다.
     * 스케줄러에 의해 주기적으로 호출됩니다.
     * - 멱등성: 동일 orderNo로 이미 Payment가 있으면 기존 반환
     * - 재시도: DB 저장 실패 시 최대 3회 재시도 (PG API는 1회만 호출)
     *
     * @param billingKey  발급받은 빌링키
     * @param customerKey 고객 식별 키
     * @param amount      결제 금액
     * @param orderNo     주문 번호 (UUID)
     * @return 결제 완료된 Payment 정보
     */
    @Transactional(noRollbackFor = PaymentException.class)
    public Payment billingPayment(String billingKey, String customerKey, Long amount, String orderNo) {
        log.info("[billingPayment] 시작: orderNo={}, amount={}", orderNo, amount);

        // 0. 멱등성: 이미 저장된 결제가 있으면 기존 반환
        var existingPayment = paymentRepository.findByOrderNo(orderNo);
        if (existingPayment.isPresent() && existingPayment.get().getStatus() == PaymentStatus.DONE) {
            log.info("[billingPayment] 멱등: 기존 Payment 반환 orderNo={}, paymentId={}", orderNo, existingPayment.get().getId());
            return existingPayment.get();
        }

        // 1. 주문 조회 및 검증
        Order order = orderRepository.findByOrderNo(orderNo)
                .orElseThrow(() -> {
                    log.error("[billingPayment] 주문 없음: orderNo={}", orderNo);
                    return new PaymentException(PaymentErrorCode.ORDER_NOT_FOUND);
                });
        log.debug("[billingPayment] 주문 조회 완료: orderId={}", order.getId());

        PaymentConfirmResult result;
        try {
            // 2. PG 자동 결제 요청 (1회만 호출, 재시도 시 호출 안 함)
            log.info("[billingPayment] PG API 호출: orderNo={}", orderNo);
            result = paymentAdapter.billingPayment(billingKey, customerKey, amount,
                    orderNo, order.getName());
            log.info("[billingPayment] PG API 성공: orderNo={}, amount={}", orderNo, result.getAmount());
        } catch (Exception e) {
            log.error("[billingPayment] PG API 실패: orderNo={}, error={}", orderNo, e.getMessage(), e);
            order.updateStatus(OrderStatus.FAILED);
            orderRepository.save(order);
            throw new PaymentException(PaymentErrorCode.BILLING_PAYMENT_FAILED);
        }

        // 3~5. DB 저장 및 후속 처리 (재시도 포함)
        return saveBillingPaymentAndProcessWithRetry(order, orderNo, result);
    }

    /**
     * 빌링키 결제 결과를 DB에 저장하고 후속 처리를 수행합니다. (재시도 로직 포함)
     */
    private Payment saveBillingPaymentAndProcessWithRetry(Order order, String orderNo,
            PaymentConfirmResult result) {
        Exception lastException = null;
        for (int attempt = 1; attempt <= PAYMENT_SAVE_MAX_RETRIES; attempt++) {
            try {
                log.info("[billingPayment] DB 저장 시도 {}/{}: orderNo={}", attempt, PAYMENT_SAVE_MAX_RETRIES, orderNo);

                var existing = paymentRepository.findByOrderNo(orderNo);
                if (existing.isPresent() && existing.get().getStatus() == PaymentStatus.DONE) {
                    log.info("[billingPayment] 재시도 중 멱등: 기존 Payment 반환 orderNo={}", orderNo);
                    return existing.get();
                }

                order.updateStatus(OrderStatus.COMPLETED);
                orderRepository.save(order);
                log.debug("[billingPayment] Order COMPLETED 저장 완료: orderNo={}", orderNo);

                Payment payment = Payment.builder()
                        .userId(order.getUserId())
                        .orderId(order.getId())
                        .orderNo(orderNo)
                        .paymentKey(result.getPaymentKey())
                        .amount(BigDecimal.valueOf(result.getAmount()))
                        .status(PaymentStatus.DONE)
                        .method(result.getMethod())
                        .paidAt(result.getApprovedAt())
                        .build();

                Payment savedPayment = paymentRepository.save(payment);
                log.info("[billingPayment] Payment 저장 완료: orderNo={}, paymentId={}", orderNo, savedPayment.getId());

                processPostPaymentActions(order);
                eventPublisher.publishEvent(new PaymentCompletedEvent(this, savedPayment, order));

                return savedPayment;
            } catch (Exception e) {
                lastException = e;
                log.warn("[billingPayment] DB 저장 실패 (시도 {}/{}): orderNo={}, error={}", attempt, PAYMENT_SAVE_MAX_RETRIES, orderNo, e.getMessage(), e);
                if (attempt < PAYMENT_SAVE_MAX_RETRIES) {
                    try {
                        long delay = RETRY_DELAY_MS * (1L << (attempt - 1));
                        Thread.sleep(delay);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new PaymentException(PaymentErrorCode.BILLING_PAYMENT_FAILED);
                    }
                }
            }
        }
        log.error("[billingPayment] DB 저장 최종 실패: orderNo={}, paymentKey={}, 수동 복구 필요", orderNo, maskPaymentKey(result.getPaymentKey()), lastException);
        throw new PaymentException(PaymentErrorCode.BILLING_PAYMENT_FAILED);
    }

    /**
     * 결제 성공 후 후속 처리를 수행합니다.
     * 예: CASH 타입 상품 구매 시 캔디 충전
     */
    private void processPostPaymentActions(Order order) {
        for (OrderItem item : order.getOrderItems()) {
            if (item.getProduct().getType() == ProductType.CASH) {
                // 충전량 계산 규칙: 100원당 1캔디
                long candyAmount = item.getPrice().longValue()
                        / PaymentExchangeConfig.CANDY_EXCHANGE_RATE
                        * item.getQuantity();

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
        long krwAmount = order.getTotalCandyAmount()
                * PaymentExchangeConfig.CANDY_EXCHANGE_RATE;

        Payment payment = Payment.builder()
                .userId(order.getUserId())
                .orderId(order.getId())
                .orderNo(order.getOrderNo())
                .paymentKey("CANDY_" + java.util.UUID.randomUUID().toString())
                .amount(BigDecimal.valueOf(krwAmount))
                .status(PaymentStatus.DONE)
                .method(PaymentMethod.CANDY) // ENUM에 CANDY 확인 필요, 없으면 CARD 등 대체
                .paidAt(Instant.now())
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
        return paymentAdapter.issueBillingKey(authKey, customerKey);
    }

    /**
     * 결제 실패 처리
     * PG사에서 리다이렉트된 실패 요청을 처리합니다.
     *
     * @param code    에러 코드
     * @param message 에러 메시지
     * @param orderNo 주문 번호
     */
    @Transactional
    public void handlePaymentFailure(String code, String message, String orderNo) {
        Order order = orderRepository.findByOrderNo(orderNo)
                .orElseThrow(() -> new PaymentException(PaymentErrorCode.ORDER_NOT_FOUND));

        order.updateStatus(OrderStatus.FAILED);
        orderRepository.save(order);

        log.error("Payment Failed: code={}, message={}, orderNo={}", code, message, orderNo);
    }
}
