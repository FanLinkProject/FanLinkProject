package org.example.backend.subscription.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.order.entity.Order;
import org.example.backend.order.entity.OrderItem;
import org.example.backend.order.enums.OrderStatus;
import org.example.backend.order.repository.OrderRepository;
import org.example.backend.payment.adapter.PaymentAdapter;
import org.example.backend.payment.dto.TossPaymentDto;
import org.example.backend.payment.entity.Payment;
import org.example.backend.payment.enums.PaymentMethod;
import org.example.backend.payment.enums.PaymentStatus;
import org.example.backend.payment.repository.PaymentRepository;
import org.example.backend.product.entity.Product;
import org.example.backend.product.enums.ProductType;
import org.example.backend.product.repository.ProductRepository;
import org.example.backend.settlement.entity.SettlementPending;
import org.example.backend.settlement.enums.SettlementSourceType;
import org.example.backend.settlement.repository.SettlementPendingRepository;
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
        private final PaymentAdapter paymentAdapter;
        private final PaymentRepository paymentRepository;
        private final SettlementPendingRepository settlementPendingRepository;

        /**
         * 현금 정기결제 구독을 생성합니다. (캔디 정기 충전)
         * 1. Toss Payments 빌링키 발급
         * 2. 첫 결제 실행
         * 3. 캔디 충전 및 구독 정보 저장
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

                // 4. 빌링키 발급
                TossPaymentDto.BillingKeyResponse billingKeyResponse = paymentAdapter.issueBillingKey(authKey,
                                customerKey);
                String billingKey = billingKeyResponse.getBillingKey();

                // 5. 첫 결제 실행
                String orderIdForBilling = "subscription-" + userId + "-" + System.currentTimeMillis();
                TossPaymentDto.PaymentConfirmResponse paymentResponse = paymentAdapter.billingPayment(
                                billingKey,
                                customerKey,
                                product.getPrice(),
                                orderIdForBilling,
                                product.getName());

                // 6. Payment 엔티티 생성
                Payment payment = Payment.builder()
                                .userId(userId)
                                .orderId(null) // 구독 결제는 주문 없음
                                .paymentKey(paymentResponse.getPaymentKey())
                                .amount(BigDecimal.valueOf(paymentResponse.getTotalAmount()))
                                .status(PaymentStatus.DONE)
                                .method(PaymentMethod.CARD)
                                .paidAt(LocalDateTime.parse(paymentResponse.getApprovedAt(),
                                                java.time.format.DateTimeFormatter.ISO_OFFSET_DATE_TIME))
                                .build();
                paymentRepository.save(payment);

                // 7. 캔디 충전
                user.chargeCandy(product.getPrice() / 100);

                // 8. Subscription 생성
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

                log.info("현금 구독 생성: userId={}, product={}, candyCharged={}",
                                userId, product.getName(), product.getPrice() / 100);

                return subscriptionRepository.save(subscription);
        }

        /**
         * 캔디 정기차감 구독을 생성합니다. (광고제거/DM)
         * 1. 유저 보유 캔디 확인 및 차감
         * 2. 구독 정보 저장
         * 3. 아티스트 상품인 경우 정산 대기 데이터 생성
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

                // OrderItem 추가
                OrderItem orderItem = OrderItem.builder()
                                .product(product)
                                .quantity(1)
                                .price(BigDecimal.ZERO) // 캔디 결제 상품의 현금가는 0으로 처리 (혹은 product.getPrice()가 0이면 그것 사용)
                                .candyPrice(product.getCandyPrice())
                                .build();

                order.addOrderItem(orderItem);

                Order savedOrder = orderRepository.save(order);

                // 7. Payment 기록 생성 (이력 관리용)
                Payment payment = Payment.builder()
                                .userId(userId)
                                .orderId(savedOrder.getId()) // Order ID 연결
                                .paymentKey("CANDY_" + java.util.UUID.randomUUID().toString())
                                .amount(BigDecimal.valueOf(product.getCandyPrice() * 100L)) // 1캔디 = 100원 가치 추산
                                .status(PaymentStatus.DONE)
                                .method(PaymentMethod.CANDY)
                                .paidAt(now)
                                .build();
                paymentRepository.save(payment);

                // 8. 정산 처리 (아티스트 DM 구독인 경우)
                createSettlementIfNeeded(product, payment);

                log.info("캔디 구독 생성: userId={}, product={}, candyUsed={}",
                                userId, product.getName(), product.getCandyPrice());

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

        /**
         * 정산 대기 데이터(SettlementPending)를 생성합니다.
         * 아티스트 상품(artistId가 있는 경우)에 대해서만 정산 데이터가 생성됩니다.
         * 플랫폼 멤버십(artistId가 없는 경우)은 정산 제외됩니다.
         *
         * @param product 구독 상품
         * @param payment 결제 정보 (Payment ID 추출용)
         */
        private void createSettlementIfNeeded(Product product, Payment payment) {
                // artistId가 없으면 플랫폼 멤버십이므로 정산 제외
                if (product.getArtistId() == null) {
                        log.debug("플랫폼 멤버십이므로 정산 제외: {}", product.getName());
                        return;
                }

                // SettlementPending 생성
                SettlementPending pending = SettlementPending.builder()
                                .paymentId(payment.getId())
                                .artistId(product.getArtistId())
                                .amount(product.getCandyPrice() * CANDY_PRICE)
                                .orderName(product.getName() + " (구독)")
                                .sourceType(SettlementSourceType.CANDY)
                                .build();

                settlementPendingRepository.save(pending);

                log.info("정산 대기열 생성 (구독): artistId={}, amount={}, product={}",
                                product.getArtistId(), product.getCandyPrice(), product.getName());
        }
}
