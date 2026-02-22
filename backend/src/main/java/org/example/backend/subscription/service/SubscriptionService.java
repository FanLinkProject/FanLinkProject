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
import org.example.backend.subscription.exception.SubscriptionErrorCode;
import org.example.backend.subscription.exception.SubscriptionException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SubscriptionService {

        private final OrderRepository orderRepository;
        private final SubscriptionRepository subscriptionRepository;
        private final UserRepository userRepository;
        private final ProductRepository productRepository;
        private final PaymentService paymentService;

        /**
         * 현금 정기결제 구독을 생성합니다. (캔디 정기 충전)
         * 1. 빌링키 발급 (PaymentAdapter)
         * 2. 첫 결제 실행 (PaymentService 위임)
         * 3. Subscription 생성
         *
         * @param userId      유저 ID
         * @param productId   상품 ID (캔디 충전 상품이어야 함)
         * @param authKey     PG사 인증 키
         * @param customerKey 고객 키
         * @param orderNo     주문 번호 (프론트엔드에서 생성한 주문)
         * @return 생성된 구독 엔티티
         */
        @Transactional
        public Subscription createCashSubscription(Long userId, Long productId, String authKey, String customerKey,
                        String orderNo) {
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
                                        throw new SubscriptionException(SubscriptionErrorCode.DUPLICATE_SUBSCRIPTION);
                                });

                // 4. 주문 조회 (Frontend에서 생성한 주문)
                Order order = orderRepository.findByOrderNo(orderNo)
                                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 주문입니다."));

                // 주문 유효성 검증
                if (!order.getUserId().equals(userId)) {
                        throw new IllegalArgumentException("본인의 주문만 처리할 수 있습니다.");
                }
                // 결제 금액 검증 (상품 가격과 주문 금액 일치 여부)
                // 주의: order.totalAmount와 product.price 비교 (BigDecimal vs Long)
                if (order.getTotalAmount().compareTo(BigDecimal.valueOf(product.getPrice())) != 0) {
                        throw new IllegalArgumentException("주문 금액이 상품 가격과 일치하지 않습니다.");
                }

                // 5. 빌링키 발급 (PaymentService 위임)
                String billingKey = paymentService.issueBillingKey(authKey, customerKey);

                // 6. 첫 결제 실행 (PaymentService 위임)
                // 내부에서 Payment 생성, 캔디 충전(PostAction), 이벤트 발행(정산) 모두 처리됨
                paymentService.billingPayment(
                                billingKey,
                                customerKey,
                                product.getPrice(),
                                order.getOrderNo());

                // 7. Subscription 생성
                Instant now = Instant.now();
                Instant oneMonthLater = now.atZone(ZoneId.systemDefault()).plusMonths(1).toInstant();
                Subscription subscription = Subscription.builder()
                                .userId(userId)
                                .product(product)
                                .startDate(now)
                                .endDate(oneMonthLater)
                                .nextPaymentDate(oneMonthLater)
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
                                        throw new SubscriptionException(SubscriptionErrorCode.DUPLICATE_SUBSCRIPTION);
                                });

                // 4. 캔디 잔액 확인 및 차감
                if (product.getCandyPrice() == null) {
                        throw new IllegalArgumentException("캔디 가격이 설정되지 않은 상품입니다.");
                }
                user.useCandy(product.getCandyPrice());

                // 5. Subscription 생성
                Instant now = Instant.now();
                Instant oneMonthLater = now.atZone(ZoneId.systemDefault()).plusMonths(1).toInstant();
                Subscription subscription = Subscription.builder()
                                .userId(userId)
                                .product(product)
                                .startDate(now)
                                .endDate(oneMonthLater)
                                .nextPaymentDate(oneMonthLater)
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
         * 현재 구현: DB에서 삭제 (Hard Delete). 추후 Soft Delete(isActive=false) 전환 권장.
         *
         * @param subscriptionId 구독 ID
         * @param userId         요청자 ID (권한 확인용)
         */
        @Transactional
        public void cancelSubscription(Long subscriptionId, Long userId) {
                Subscription subscription = subscriptionRepository.findById(subscriptionId)
                                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 구독입니다."));

                if (!subscription.getUserId().equals(userId)) {
                        throw new IllegalArgumentException("본인의 구독만 해지할 수 있습니다.");
                }

                if (!subscription.getIsActive()) {
                        throw new IllegalArgumentException("이미 해지된 구독입니다.");
                }

                subscriptionRepository.deleteById(subscriptionId);

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

        /**
         * 해당 아티스트의 DM(캔디 구독) 상품을 현재 유저가 활성 구독 중인지 여부.
         *
         * @param userId   유저 ID
         * @param artistId 아티스트(상품 소유자) ID
         * @return 구독 중이면 true
         */
        public boolean hasActiveDmSubscription(Long userId, Long artistId) {
                return subscriptionRepository.existsActiveSubscriptionForArtist(
                        userId, artistId, Instant.now());
        }

}
