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

import java.time.Instant;

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
        // 정산 기간 분류 기준은 pending 생성시각이 아니라 실제 결제 완료 시각.
        Instant paidAt = payment.getPaidAt() != null ? payment.getPaidAt() : Instant.now();

        for (OrderItem item : order.getOrderItems()) {
            Product product = item.getProduct();

            // [NPE 방지] 상품이 삭제되었거나 존재하지 않는 경우 방어 로직
            if (product == null) {
                log.warn("[정산 생성 실패] 상품 정보가 존재하지 않습니다. orderItemId={}", item.getId());
                continue;
            }

            // [정산 제외 1] 정산 대상이 아닌 상품 (플랫폼이 전액 수취)
            if (!product.getType().isSettlementTarget()) {
                log.debug("[정산 제외] 정산 대상 상품이 아님: type={}, name={}",
                        product.getType(), product.getName());
                continue;
            }

            if (product.getArtistId() == null) {
                log.warn("[정산 제외] 아티스트 ID가 없습니다. product={}", product.getName());
                continue;
            }

            if (item.getId() == null) {
                log.warn("[정산 생성 실패] 주문 아이템 ID(OrderItem ID)가 null. paymentId={}, product={}",
                        payment.getId(), product.getName());
                continue;
            }

            SettlementSourceType sourceType = determineSourceType(product.getType());
            long settlementAmount = calculateSettlementAmount(product, item);

            int inserted = settlementPendingRepository.insertIgnore(
                    payment.getId(),
                    product.getArtistId(),
                    settlementAmount,
                    product.getName(),
                    item.getId(),
                    sourceType.name(),
                    paidAt,
                    Instant.now()
            );

            if (inserted > 0) {
                log.info("[정산 대기 생성 완료] 아티스트: artistId={}, orderItemId={}, amount={}, product={}, sourceType={}",
                        product.getArtistId(), item.getId(), settlementAmount, product.getName(), sourceType);
            } else {
                log.info("[정산 대기 중복 스킵] 이미 존재하는 정산 데이터입니다. paymentId={}, artistId={}, orderItemId={}",
                        payment.getId(), product.getArtistId(), item.getId());
            }
        }
    }

    private long calculateSettlementAmount(Product product, OrderItem item) {
        ProductPaymentMethod paymentMethod = product.getType().getPaymentMethod();

        if (paymentMethod == ProductPaymentMethod.CANDY_ONLY) {
            // 마스터 상품의 현재 가격이 아닌, 주문 당시 OrderItem에 기록된 캔디 가격(스냅샷)을 사용합니다.
            long candyPrice = item.getCandyPrice() != null ? item.getCandyPrice() : 0L;
            return candyPrice * PaymentExchangeConfig.CANDY_EXCHANGE_RATE * item.getQuantity();
        }
        // 현금 결제 시에도 OrderItem에 저장된 당시 단가(price)를 사용합니다.
        return item.getPrice().longValue() * item.getQuantity();
    }

    private SettlementSourceType determineSourceType(ProductType productType) {
        return switch (productType.getPaymentMethod()) {
            case CASH_ONLY -> SettlementSourceType.CASH;
            case CANDY_ONLY -> SettlementSourceType.CANDY;
        };
    }
}
