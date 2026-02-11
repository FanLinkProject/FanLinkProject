package org.example.backend.settlement.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.order.entity.Order;
import org.example.backend.order.entity.OrderItem;
import org.example.backend.payment.config.PaymentExchangeConfig;
import org.example.backend.payment.entity.Payment;
import org.example.backend.product.entity.Product;
import org.example.backend.product.enums.ProductPaymentMethod;
import org.example.backend.product.enums.ProductType;
import org.example.backend.settlement.enums.SettlementSourceType;
import org.example.backend.settlement.repository.SettlementPendingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 정산 대기 데이터 생성 서비스
 * - Listener와 RecoveryService에서 공통으로 사용합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SettlementPendingService {

    private final SettlementPendingRepository settlementPendingRepository;

    /**
     * 정산 대기 데이터를 생성합니다.
     *
     * <p>중복 방지 전략: MySQL INSERT IGNORE</p>
     * <ul>
     *   <li>Unique Constraint(payment_id, artist_id, order_name) 위반 시 해당 행만 무시</li>
     *   <li>JPA 영속성 컨텍스트를 거치지 않는 Native Query 사용</li>
     *   <li>Hibernate 세션 오염 없이 트랜잭션 내에서 안전하게 부분 저장 가능</li>
     * </ul>
     *
     * @param payment 결제 정보
     * @param order   주문 정보
     */
    @Transactional
    public void createSettlementPending(Payment payment, Order order) {
        for (OrderItem item : order.getOrderItems()) {
            Product product = item.getProduct();

            // [NPE 방지] 상품이 삭제되었거나 존재하지 않는 경우 방어 로직
            if (product == null) {
                log.warn("상품 정보가 존재하지 않습니다 (삭제됨?): OrderItem ID={}", item.getId());
                continue;
            }

            // [정산 제외 1] 정산 대상이 아닌 상품 (플랫폼이 전액 수취)
            if (!product.getType().isSettlementTarget()) {
                log.debug("정산 대상이 아닌 상품: type={}, name={}",
                        product.getType(), product.getName());
                continue;
            }

            // [정산 제외 2] artistId가 없는 경우 (플랫폼 상품)
            if (product.getArtistId() == null) {
                log.warn("아티스트 ID가 없는 상품: {}", product.getName());
                continue;
            }

            // [정산 원천 결정]
            SettlementSourceType sourceType = determineSourceType(product.getType());

            // [금액 계산]
            long settlementAmount = calculateSettlementAmount(product, item);

            // [INSERT IGNORE] 중복 시 해당 행만 무시, 나머지는 정상 저장
            int inserted = settlementPendingRepository.insertIgnore(
                    payment.getId(),
                    product.getArtistId(),
                    settlementAmount,
                    product.getName(),
                    sourceType.name()
            );

            if (inserted > 0) {
                log.info("정산 대기열 생성: artistId={}, amount={}, product={}, sourceType={}",
                        product.getArtistId(), settlementAmount, product.getName(), sourceType);
            } else {
                log.info("정산 대기열이 이미 존재합니다 (중복 스킵): paymentId={}, artistId={}, orderName={}",
                        payment.getId(), product.getArtistId(), product.getName());
            }
        }
    }

    private long calculateSettlementAmount(Product product, OrderItem item) {
        ProductPaymentMethod paymentMethod = product.getType().getPaymentMethod();

        if (paymentMethod == ProductPaymentMethod.CANDY_ONLY) {
            long candyPrice = product.getCandyPrice() != null ? product.getCandyPrice() : 0L;
            return candyPrice * PaymentExchangeConfig.CANDY_EXCHANGE_RATE * item.getQuantity();
        } else {
            return item.getPrice().longValue() * item.getQuantity();
        }
    }

    private SettlementSourceType determineSourceType(ProductType productType) {
        return switch (productType.getPaymentMethod()) {
            case CASH_ONLY -> SettlementSourceType.CASH;
            case CANDY_ONLY -> SettlementSourceType.CANDY;
        };
    }
}
