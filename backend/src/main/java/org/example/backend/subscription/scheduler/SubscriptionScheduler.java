package org.example.backend.subscription.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.payment.entity.Payment;
import org.example.backend.payment.enums.PaymentMethod;
import org.example.backend.payment.enums.PaymentStatus;
import org.example.backend.payment.repository.PaymentRepository;
import org.example.backend.product.entity.Product;
import org.example.backend.subscription.entity.Subscription;
import org.example.backend.subscription.repository.SubscriptionRepository;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.example.backend.order.entity.Order;
import org.example.backend.order.entity.OrderItem;
import org.example.backend.order.enums.OrderStatus;
import org.example.backend.order.repository.OrderRepository;
import org.example.backend.payment.service.PaymentService;
import org.example.backend.settlement.event.PaymentCompletedEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.example.backend.payment.config.PaymentExchangeConfig;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class SubscriptionScheduler {

    private final SubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final PaymentService paymentService;
    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 매일 00:00에 정기 결제 로직을 실행하는 메인 스케줄러 메서드입니다.
     * 현금 구독(processCashSubscriptions)과 캔디 구독(processCandySubscriptions)을 순차적으로
     * 처리합니다.
     */
    @Scheduled(cron = "0 0 0 * * *")
    public void processSubscriptions() {
        log.info("=== 구독 정기 결제 스케줄러 시작 ===");

        processCashSubscriptions();
        processCandySubscriptions();

        log.info("=== 구독 정기 결제 스케줄러 종료 ===");
    }

    /**
     * 현금 구독 정기 결제를 일괄 처리합니다.
     * 저장된 빌링키를 사용하여 결제를 시도하고, 성공 시 캔디를 충전합니다.
     */
    @Transactional
    public void processCashSubscriptions() {
        LocalDateTime now = LocalDateTime.now();
        List<Subscription> cashSubscriptions = subscriptionRepository.findCashSubscriptionsDue(now);

        log.info("처리할 현금 구독: {}건", cashSubscriptions.size());

        for (Subscription subscription : cashSubscriptions) {
            try {
                processCashSubscription(subscription);
            } catch (Exception e) {
                log.error("현금 구독 처리 실패: subscriptionId={}, error={}",
                        subscription.getId(), e.getMessage(), e);
            }
        }
    }

    /**
     * 캔디 구독 정기 차감을 일괄 처리합니다.
     * 캔디 잔액이 부족한 경우 예외 처리를 통해 구독을 자동 해지합니다.
     */
    @Transactional
    public void processCandySubscriptions() {
        LocalDateTime now = LocalDateTime.now();
        List<Subscription> candySubscriptions = subscriptionRepository.findCandySubscriptionsDue(now);

        log.info("처리할 캔디 구독: {}건", candySubscriptions.size());

        for (Subscription subscription : candySubscriptions) {
            try {
                processCandySubscription(subscription);
            } catch (Exception e) {
                log.error("캔디 구독 처리 실패: subscriptionId={}, error={}",
                        subscription.getId(), e.getMessage(), e);
                // 잔액 부족 등의 이유로 실패 시 구독 해지
                subscriptionRepository.deleteById(subscription.getId());
                log.warn("캔디 부족으로 구독 자동 해지: subscriptionId={}", subscription.getId());
            }
        }
    }

    /**
     * 개별 현금 구독 처리
     * Order 생성 -> 결제 -> 이벤트 -> 정산/캔디충전
     */
    private void processCashSubscription(Subscription subscription) {
        Product product = subscription.getProduct();
        String customerKey = "customer-" + subscription.getUserId();

        // 1. Order 생성 (필수: PaymentService가 Order를 요구함)
        Order order = Order.builder()
                .userId(subscription.getUserId())
                .totalAmount(BigDecimal.valueOf(product.getPrice()))
                .totalCandyAmount(0L)
                .name(product.getName() + " (정기결제)")
                .status(OrderStatus.PENDING) // 결제 전
                .orderNo("SUB_CASH_" + java.util.UUID.randomUUID().toString())
                .build();

        OrderItem orderItem = OrderItem.builder()
                .product(product)
                .quantity(1)
                .price(BigDecimal.valueOf(product.getPrice()))
                .candyPrice(0L)
                .build();
        order.addOrderItem(orderItem);
        Order savedOrder = orderRepository.save(order);

        // 2. 통합 결제 서비스 호출 (결제 + 캔디충전 + 이벤트발행까지 모두 수행)
        paymentService.billingPayment(
                subscription.getBillingKey(),
                customerKey,
                product.getPrice(),
                savedOrder.getOrderNo());

        // 3. 다음 결제일 갱신
        subscription.renewNextPaymentDate();
        subscriptionRepository.save(subscription);

        log.info("현금 구독 갱신 성공: subscriptionId={}, userId={}",
                subscription.getId(), subscription.getUserId());
    }

    /**
     * 개별 캔디 구독 처리
     * 리팩토링: 직접 정산 데이터 생성 X -> PaymentCompletedEvent 발행 O
     */
    private void processCandySubscription(Subscription subscription) {
        Product product = subscription.getProduct();

        // 1. 유저 캔디 차감
        User user = userRepository.findById(subscription.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));
        user.useCandy(product.getCandyPrice()); // 잔액 부족 시 예외 발생

        // 2. Order 생성 (Payment에 orderId가 필요함)
        Order order = Order.builder()
                .userId(subscription.getUserId())
                .totalAmount(BigDecimal.ZERO)
                .totalCandyAmount(product.getCandyPrice())
                .name(product.getName() + " (구독 갱신)")
                .status(OrderStatus.COMPLETED)
                .orderNo("CANDY_RENEW_" + java.util.UUID.randomUUID().toString())
                .build();

        OrderItem orderItem = OrderItem.builder()
                .product(product)
                .quantity(1)
                .price(BigDecimal.ZERO)
                .candyPrice(product.getCandyPrice())
                .build();

        order.addOrderItem(orderItem);
        Order savedOrder = orderRepository.save(order);

        // 3. Payment 생성
        // 캔디 가치를 환산하여 저장 (GlobalConfig 상수 사용)
        long krwAmount = product.getCandyPrice()
                * PaymentExchangeConfig.CANDY_EXCHANGE_RATE;

        Payment payment = Payment.builder()
                .userId(subscription.getUserId())
                .orderId(savedOrder.getId())
                .paymentKey("CANDY_RENEW_" + java.util.UUID.randomUUID().toString())
                .amount(BigDecimal.valueOf(krwAmount))
                .status(PaymentStatus.DONE)
                .method(PaymentMethod.CARD)
                .paidAt(Instant.now())
                .build();
        Payment savedPayment = paymentRepository.save(payment);

        // 4. 정산 이벤트 발행
        // SettlementEventListener가 ProductType을 보고 정산 여부를 판단하고 처리함
        eventPublisher.publishEvent(new PaymentCompletedEvent(this, savedPayment, savedOrder));

        // 5. 다음 결제일 갱신
        subscription.renewNextPaymentDate();
        subscriptionRepository.save(subscription);

        log.info("캔디 구독 갱신 성공 (이벤트 발행 완료): subscriptionId={}, userId={}",
                subscription.getId(), subscription.getUserId());
    }
}
