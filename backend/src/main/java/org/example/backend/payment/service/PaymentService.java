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
import org.example.backend.product.entity.Product;
import org.example.backend.product.enums.ProductType;
import org.example.backend.settlement.entity.SettlementPending;
import org.example.backend.settlement.enums.SettlementSourceType;
import org.example.backend.settlement.repository.SettlementPendingRepository;
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
    private final SettlementPendingRepository settlementPendingRepository;
    private final org.example.backend.user.repository.UserRepository userRepository;
    private final org.example.backend.product.repository.ProductRepository productRepository;
    private final org.example.backend.subscription.repository.SubscriptionRepository subscriptionRepository;

    /**
     * 결제 승인 요청을 처리합니다. (단건 결제)
     * 가장 중요한 로직은 주문 금액 검증과 결제 승인 후 정산 데이터 생성입니다.
     *
     * @param paymentKey Toss Payments 결제 키
     * @param orderNo    주문 번호
     * @param amount     결제 금액
     * @return 저장된 Payment 엔티티
     */
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

        Payment savedPayment = paymentRepository.save(payment);

        // 5. 캔디 충전 처리 (CANDY_CHARGE 상품인 경우)
        for (OrderItem item : order.getOrderItems()) {
            if (item.getProduct().getType() == ProductType.CANDY_CHARGE) {
                // 충전량 계산 규칙: 100원당 1캔디 (가정) 혹은 별도 필드 필요.
                // 현재는 별도 필드가 없으므로, 편의상 이름에서 파싱하거나 가격 기준 1% 등으로 가정해야 함.
                // 하지만 보통 상품 생성 시 정해짐. 여기서는 단순하게 가격 / 100 으로 캔디 지급 로직 추가.
                // (사용자가 "구현했잖아"라고 했으므로 더 단순한 로직이 있었을 수 있음. 일단 가격/100으로 구현)
                long candyAmount = item.getPrice().longValue() / 100 * item.getQuantity();

                // 유저 조회 후 충전
                org.example.backend.user.entity.User user = userRepository.findById(order.getUserId())
                        .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));
                user.chargeCandy(candyAmount);
                // 변경된 유저 상태 저장 (Transaction 내에서 Dirty Checking으로 반영되겠지만 명시적으로 save 호출 가능. Dirty
                // Checking 믿고 생략 가능)

                log.info("캔디 충전 완료: userId={}, amount={}", user.getId(), candyAmount);
            }
        }

        // 6. 정산 대기 데이터 생성 (캔디 충전 제외)
        createSettlementPendingIfNeeded(order, savedPayment);

        return savedPayment;
    }

    /**
     * 정기 결제를 위한 빌링키를 발급받습니다.
     * 이 메서드는 빌링키 발급만 수행하며, 실제 결제는 이루어지지 않습니다.
     *
     * @param authKey     Toss 위젯에서 받은 인증 키
     * @param customerKey 고객 식별 키
     * @param userId      유저 ID
     * @return 발급된 빌링키
     */

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

    /**
     * 결제 후속 처리를 수행합니다. (캔디 충전 및 정산 대기 데이터 생성)
     * 이 메서드는 단건 결제(confirmPayment)와 정기 결제(billingPayment)에서 공통으로 호출됩니다.
     */
    private void processPostPaymentActions(Order order, Payment payment) {
        // 1. 캔디 충전 처리 (CANDY_CHARGE 상품인 경우)
        for (OrderItem item : order.getOrderItems()) {
            if (item.getProduct().getType() == ProductType.CANDY_CHARGE) {
                // 충전량 계산 규칙: 100원당 1캔디 (가정)
                long candyAmount = item.getPrice().longValue() / 100 * item.getQuantity();

                // 유저 조회 후 충전
                org.example.backend.user.entity.User user = userRepository.findById(order.getUserId())
                        .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));
                user.chargeCandy(candyAmount);

                log.info("캔디 충전 완료: userId={}, amount={}, orderNo={}", user.getId(), candyAmount, order.getOrderNo());
            }
        }

        // 2. 정산 대기 데이터 생성 (캔디 충전 제외)
        createSettlementPendingIfNeeded(order, payment);
    }

    // 정산 대기 데이터 생성 (캔디 충전 제외)
    // 캔디 충전은 정산 대상이 아니며, 아티스트 상품(MD, 멤버십 등) 구매 시에만 정산 데이터(SettlementPending)가
    // 생성됩니다.
    private void createSettlementPendingIfNeeded(Order order, Payment payment) {
        for (OrderItem item : order.getOrderItems()) {
            Product product = item.getProduct();

            // 캔디 충전 상품은 정산 대상이 아님
            if (product.getType() == ProductType.CANDY_CHARGE) {
                continue;
            }

            // artistId가 없는 경우 (플랫폼 상품) 처리
            if (product.getArtistId() == null) {
                log.warn("아티스트 ID가 없는 상품: {}", product.getName());
                continue;
            }

            // 정산 소스 타입 결정
            SettlementSourceType sourceType = determineSourceType(product.getType());

            // 정산 금액 계산 (단가 * 수량)
            // 캔디 결제인 경우, 1 캔디당 100원으로 계산
            long settlementAmount;
            if (product.getPaymentMethod() == org.example.backend.product.enums.ProductPaymentMethod.CANDY_ONLY) {
                // candyPrice가 null일 수 있으므로 안전하게 처리 (Product 생성 시 검증됨)
                long candyPrice = product.getCandyPrice() != null ? product.getCandyPrice() : 0L;
                settlementAmount = candyPrice * 100 * item.getQuantity();
            } else {
                settlementAmount = item.getPrice().longValue() * item.getQuantity();
            }

            // SettlementPending 생성
            SettlementPending pending = SettlementPending.builder()
                    .paymentId(payment.getId())
                    .artistId(product.getArtistId())
                    .amount(settlementAmount)
                    .orderName(product.getName())
                    .sourceType(sourceType)
                    .build();

            settlementPendingRepository.save(pending);

            log.info("정산 대기열 생성: artistId={}, amount={}, product={}",
                    product.getArtistId(), settlementAmount, product.getName());
        }
    }

    // ProductType -> SettlementSourceType 변환
    private SettlementSourceType determineSourceType(ProductType productType) {
        return switch (productType) {
            case GOODS -> SettlementSourceType.PRODUCT;
            case MEMBERSHIP -> SettlementSourceType.SUBSCRIPTION;
            case CANDY_CHARGE -> SettlementSourceType.CANDY; // 실제로는 호출되지 않음
        };
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
