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

        // 5. 정산 대기 데이터 생성 (캔디 충전 제외)
        createSettlementPendingIfNeeded(order, savedPayment);

        return savedPayment;
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

    // 정산 대기 데이터 생성 (캔디 충전 제외)
    private void createSettlementPendingIfNeeded(Order order, Payment payment) {
        for (OrderItem item : order.getOrderItems()) {
            Product product = item.getProduct();

            // 캔디 충전 상품은 정산 대상이 아님
            if (product.getType() == ProductType.CANDY_CHARGE) {
                log.debug("캔디 충전 상품이므로 정산 대기열 생성 생략: {}", product.getName());
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
            Long settlementAmount = item.getPrice().longValue() * item.getQuantity();

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
