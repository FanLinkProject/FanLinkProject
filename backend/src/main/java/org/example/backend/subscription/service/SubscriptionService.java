package org.example.backend.subscription.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.order.entity.Order;
import org.example.backend.order.entity.OrderItem;
import org.example.backend.order.enums.OrderStatus;
import org.example.backend.order.repository.OrderRepository;
import org.example.backend.payment.service.PaymentService;
import org.example.backend.product.entity.Product;
import org.example.backend.product.enums.ProductType;
import org.example.backend.product.repository.ProductRepository;
import org.example.backend.subscription.entity.Subscription;
import org.example.backend.subscription.repository.SubscriptionRepository;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.example.backend.product.enums.ProductPaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SubscriptionService {

        private final int CANDY_PRICE = 100;

        private final OrderRepository orderRepository;
        private final SubscriptionRepository subscriptionRepository;
        private final UserRepository userRepository;
        private final ProductRepository productRepository;
        private final PaymentService paymentService;

        /**
         * 현금 정기결제 구독을 생성합니다. (캔디 정기 충전)
         * 1. Toss Payments 빌링키 발급
         * 2. Order 생성
         * 3. 첫 결제 실행 (PaymentService 위임)
         * 4. Subscription 생성
         *
         * @param userId      유저 ID
         * @param productId   상품 ID (캔디 충전 상품이어야 함)
         * @param authKey     Toss 인증 키
         * @param customerKey 고객 키
         * @return 생성된 구독 엔티티
         */
        @Transactional
        public Subscription createCashSubscription(Long userId, Long productId, String authKey, String customerKey) {
                // 1. 유저 및 상품 조회
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));
                Product product = productRepository.findById(productId)
                                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 상품입니다."));

                // 2. 캔디 충전 상품 검증
                if (product.getType() != ProductType.CASH) {
                        throw new IllegalArgumentException("현금 구독은 캔디 충전 상품만 가능합니다.");
                }

                // 3. 중복 구독 확인
                subscriptionRepository.findByUserIdAndProduct_IdAndIsActive(userId, productId, true)
                                .ifPresent(s -> {
                                        throw new IllegalArgumentException("이미 동일한 상품을 구독 중입니다.");
                                });

                // 4. 빌링키 발급 (PaymentService 위임)
                String billingKey = paymentService.issueBillingKey(authKey, customerKey);

                // 5. Order 생성 (Payment 서비스는 Order ID를 요구함)
                Order order = Order.builder()
                                .userId(userId)
                                .totalAmount(BigDecimal.valueOf(product.getPrice()))
                                .totalCandyAmount(0L)
                                .name(product.getName() + " (구독)")
                                .status(OrderStatus.PENDING) // 결제 전 단계
                                .orderNo("CASH_SUB_" + java.util.UUID.randomUUID().toString())
                                .build();

                OrderItem orderItem = OrderItem.builder()
                                .product(product)
                                .quantity(1)
                                .price(BigDecimal.valueOf(product.getPrice()))
                                .candyPrice(0L)
                                .build();

                order.addOrderItem(orderItem);
                Order savedOrder = orderRepository.save(order);

                // 6. 첫 결제 실행 (PaymentService 위임)
                // 내부에서 Payment 생성, 캔디 충전(PostAction), 이벤트 발행(정산) 모두 처리됨
                paymentService.billingPayment(
                                billingKey,
                                customerKey,
                                product.getPrice(),
                                savedOrder.getOrderNo()); // 수정: Order ID(Long) -> Order No(String)

                // 7. Subscription 생성
                LocalDateTime now = LocalDateTime.now();
                Subscription subscription = Subscription.builder()
                                .userId(userId)
                                .product(product)
                                .startDate(now)
                                .endDate(now.plusMonths(1))
                                .nextPaymentDate(now.plusMonths(1))
                                .billingKey(billingKey)
                                .isActive(true)
                                .build();

                Subscription savedSubscription = subscriptionRepository.save(subscription);

                log.info("현금 구독 생성 완료: userId={}, subscriptionId={}", userId, savedSubscription.getId());

                return savedSubscription;
        }

        /**
         * 캔디 정기차감 구독을 생성합니다. (광고제거/DM)
         * 1. 유저 보유 캔디 확인 및 차감
         * 2. Order 생성
         * 3. Payment 생성 (PaymentService 위임)
         * 4. Subscription 생성
         *
         * @param userId    유저 ID
         * @param productId 상품 ID
         * @return 생성된 구독 엔티티
         */
        @Transactional
        public Subscription createCandySubscription(Long userId, Long productId) {
                // 1. 유저 및 상품 조회
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));
                Product product = productRepository.findById(productId)
                                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 상품입니다."));

                // 2. 멤버십 상품 검증 (캔디 결제 상품인지 확인)
                if (product.getPaymentMethod() != ProductPaymentMethod.CANDY_ONLY) {
                        throw new IllegalArgumentException("캔디 구독은 캔디 결제 상품만 가능합니다.");
                }

                // 3. 중복 구독 확인
                subscriptionRepository.findByUserIdAndProduct_IdAndIsActive(userId, productId, true)
                                .ifPresent(s -> {
                                        throw new IllegalArgumentException("이미 동일한 상품을 구독 중입니다.");
                                });

                // 4. 캔디 잔액 확인 및 차감
                if (product.getCandyPrice() == null) {
                        throw new IllegalArgumentException("캔디 가격이 설정되지 않은 상품입니다.");
                }
                user.useCandy(product.getCandyPrice());

                // 5. Subscription 생성
                LocalDateTime now = LocalDateTime.now();
                Subscription subscription = Subscription.builder()
                                .userId(userId)
                                .product(product)
                                .startDate(now)
                                .endDate(now.plusMonths(1))
                                .nextPaymentDate(now.plusMonths(1))
                                .billingKey(null) // 캔디 구독
                                .isActive(true)
                                .build();
                Subscription savedSubscription = subscriptionRepository.save(subscription);

                // 6. Order 생성 (Payment에 orderId가 필요함)
                Order order = Order.builder()
                                .userId(userId)
                                .totalAmount(BigDecimal.ZERO)
                                .totalCandyAmount(product.getCandyPrice())
                                .name(product.getName() + " (구독)")
                                .status(OrderStatus.COMPLETED)
                                .orderNo("CANDY_SUB_" + java.util.UUID.randomUUID().toString())
                                .build();

                OrderItem orderItem = OrderItem.builder()
                                .product(product)
                                .quantity(1)
                                .price(BigDecimal.ZERO)
                                .candyPrice(product.getCandyPrice())
                                .build();

                order.addOrderItem(orderItem);
                Order savedOrder = orderRepository.save(order);

                // 7. Payment 기록 생성 (PaymentService 위임)
                // 내부에서 Payment 저장 및 정산 이벤트 발행 처리
                paymentService.createCandyPayment(savedOrder);

                log.info("캔디 구독 생성 완료: userId={}, subscriptionId={}", userId, savedSubscription.getId());

                return savedSubscription;
        }

        /**
         * 구독을 해지합니다.
         * 구독의 상태를 비활성화(isActive = false)로 변경합니다.
         * (현재 구현은 Hard Delete이나 추후 Soft Delete로 전환 권장)
         *
         * @param subscriptionId 구독 ID
         * @param userId         요청자 ID (권한 확인용)
         */
        @Transactional
        public void cancelSubscription(Long subscriptionId, Long userId) {
                Subscription subscription = subscriptionRepository.findById(subscriptionId)
                                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 구독입니다."));

                // 본인 소유 확인
                if (!subscription.getUserId().equals(userId)) {
                        throw new IllegalArgumentException("본인의 구독만 해지할 수 있습니다.");
                }

                if (!subscription.getIsActive()) {
                        throw new IllegalArgumentException("이미 해지된 구독입니다.");
                }

                // isActive를 false로 변경 (soft delete)
                // Note: Subscription 엔티티에 setter가 없으므로 필드 직접 접근 필요
                // 실제 운영시에는 Subscription에 cancel() 메서드 추가 권장
                subscriptionRepository.deleteById(subscriptionId); // 임시로 hard delete

                log.info("구독 해지: subscriptionId={}, userId={}", subscriptionId, userId);
        }

        /**
         * 유저의 활성화된 구독 목록을 조회합니다.
         *
         * @param userId 유저 ID
         * @return 활성 구독 목록
         */
        public List<Subscription> getMySubscriptions(Long userId) {
                return subscriptionRepository.findByUserIdAndIsActive(userId, true);
        }

}
