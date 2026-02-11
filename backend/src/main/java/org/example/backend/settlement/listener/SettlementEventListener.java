package org.example.backend.settlement.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.order.entity.Order;
import org.example.backend.order.entity.OrderItem;
import org.example.backend.payment.config.PaymentExchangeConfig;
import org.example.backend.payment.entity.Payment;
import org.example.backend.product.entity.Product;
import org.example.backend.product.enums.ProductPaymentMethod;
import org.example.backend.product.enums.ProductType;
import org.example.backend.settlement.entity.SettlementFailureLog;
import org.example.backend.settlement.entity.SettlementPending;
import org.example.backend.settlement.enums.SettlementSourceType;
import org.example.backend.settlement.event.PaymentCompletedEvent;
import org.example.backend.settlement.repository.SettlementFailureLogRepository;
import org.example.backend.settlement.repository.SettlementPendingRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.io.PrintWriter;
import java.io.StringWriter;

/**
 * 정산 이벤트 리스너
 * 결제 완료 이벤트를 수신하여 정산 대기 데이터를 생성합니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SettlementEventListener {

    private final SettlementPendingRepository settlementPendingRepository;
    private final SettlementFailureLogRepository settlementFailureLogRepository;

    /**
     * 결제 완료 이벤트를 처리하여 정산 대기 데이터를 생성합니다.
     *
     * 트랜잭션 전략
     * - {@code @TransactionalEventListener(phase = AFTER_COMMIT)}: Payment 트랜잭션이 성공적으로 커밋된 후에만 실행
     * - {@code @Transactional(propagation = REQUIRES_NEW)}: 독립적인 새 트랜잭션에서 실행
     *
     * 장점
     * 
     *   데이터 정합성 보장: Payment가 실제로 DB에 저장된 후에만 정산 데이터 생성
     *   Orphan 데이터 방지: Payment 롤백 시 정산 데이터 생성 안 됨
     *   실패 격리: 정산 데이터 생성 실패가 Payment에 영향 없음
     * 
     *
     * 정산 대상 판별 규칙 (새로운 ProductType 기준)
     * 
     *   isSettlementTarget() == false: 정산 제외 (플랫폼 전액 수익)
     *   artistId가 null: 정산 제외 (플랫폼 상품)
     *   isSettlementTarget() == true AND artistId != null: 정산 대상
     * 
     *
     * ProductType별 정산 대상 여부
     * 
     *   ✅ SETTLEMENT_CASH: 정산 대상 (현금 결제 아티스트 상품) → SettlementSourceType.CASH (90% 정산)
     *   ✅ SETTLEMENT_CANDY: 정산 대상 (캔디 결제 아티스트 상품) → SettlementSourceType.CANDY (20% 정산)
     *   ❌ CASH: 정산 제외 (플랫폼 캔디 충전 상품, 플랫폼 전액 수익)
     *   ❌ CANDY: 정산 제외 (플랫폼 캔디 상품, 플랫폼 전액 수익)
     * 
     *
     * 정산 금액 계산
     * - ProductPaymentMethod.CASH_ONLY: settlementAmount = price * quantity
     * - ProductPaymentMethod.CANDY_ONLY: settlementAmount = candyPrice * CANDY_EXCHANGE_RATE * quantity
     *   (환율은 PaymentExchangeConfig.CANDY_EXCHANGE_RATE 참조)
     *
     *  비율 적용 (SettlementSourceType)
     * - CASH (0.9): 현금 판매액의 90% 아티스트 지급
     * - CANDY (0.2): 캔디 판매액의 20% 아티스트 지급
     *
     * @param event 결제 완료 이벤트
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handlePaymentCompleted(PaymentCompletedEvent event) {
        Payment payment = event.getPayment();
        Order order = event.getOrder();

        log.debug("결제 완료 이벤트 수신: paymentId={}, orderId={}",
            payment.getId(), order.getId());

        try {
            processSettlementPending(payment, order);
        } catch (Exception e) {
            // 결제는 이미 성공했으므로 예외를 던지지 않고 로그만 남김
            // 배치 작업에서 누락된 정산 데이터를 복구해야 함
            log.error("정산 대기 데이터 생성 실패 - 복구 필요! " +
                    "paymentId={}, orderId={}, userId={}, amount={}, " +
                    "orderNo={}, error={}",
                    payment.getId(),
                    order.getId(),
                    payment.getUserId(),
                    payment.getAmount(),
                    order.getOrderNo(),
                    e.getMessage(),
                    e);

            // 실패 로그를 DB에 저장 (복구용)
            saveFailureLog(payment, order, e);
        }
    }

    /**
     * 정산 데이터 생성 실패 로그를 저장합니다.
     *
     * @param payment 결제 정보
     * @param order 주문 정보
     * @param exception 발생한 예외
     */
    private void saveFailureLog(Payment payment, Order order, Exception exception) {
        try {
            String stackTrace = getStackTraceAsString(exception);

            SettlementFailureLog failureLog = SettlementFailureLog.builder()
                    .paymentId(payment.getId())
                    .orderId(order.getId())
                    .userId(payment.getUserId())
                    .orderNo(order.getOrderNo())
                    .errorMessage(exception.getMessage())
                    .stackTrace(stackTrace)
                    .build();

            settlementFailureLogRepository.save(failureLog);

            log.info("정산 실패 로그 저장 완료: paymentId={}, failureLogId={}",
                    payment.getId(), failureLog.getId());

        } catch (Exception e) {
            // 실패 로그 저장마저 실패한 경우 (심각한 상황)
            log.error("정산 실패 로그 저장 중 오류 발생 - 긴급 확인 필요! paymentId={}, error={}",
                    payment.getId(), e.getMessage(), e);
        }
    }

    /**
     * 예외의 스택 트레이스를 문자열로 변환합니다.
     *
     * @param exception 예외 객체
     * @return 스택 트레이스 문자열
     */
    private String getStackTraceAsString(Exception exception) {
        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);
        exception.printStackTrace(pw);
        String stackTrace = sw.toString();

        // DB 컬럼 크기 제한 고려 (필요시 자르기)
        if (stackTrace.length() > 5000) {
            stackTrace = stackTrace.substring(0, 5000) + "... (truncated)";
        }

        return stackTrace;
    }

    /**
     * 정산 대기 데이터를 생성합니다.
     *
     * @param payment 결제 정보
     * @param order 주문 정보
     */
    private void processSettlementPending(Payment payment, Order order) {
        for (OrderItem item : order.getOrderItems()) {
            Product product = item.getProduct();

            // [정산 제외 1] 정산 대상이 아닌 상품 (플랫폼이 전액 수취)
            // ProductType.isSettlementTarget() == false인 경우
            // ProductType.CASH (플랫폼 캔디 충전), CANDY (플랫폼 캔디 상품)는 정산 제외
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

            // [정산 원천 결정] 상품 결제 방식으로부터 정산 원천 타입 결정
            SettlementSourceType sourceType = determineSourceType(product.getType());

            // [금액 계산] 결제 방식에 따라 정산 기준금 계산
            long settlementAmount = calculateSettlementAmount(product, item);

            // SettlementPending 저장
            SettlementPending pending = SettlementPending.builder()
                    .paymentId(payment.getId())
                    .artistId(product.getArtistId())
                    .amount(settlementAmount)
                    .orderName(product.getName())
                    .sourceType(sourceType)
                    .build();

            settlementPendingRepository.save(pending);

            log.info("정산 대기열 생성: artistId={}, amount={}, product={}, sourceType={}",
                    product.getArtistId(), settlementAmount, product.getName(), sourceType);
        }
    }

    /**
     * 정산 금액을 계산합니다.
     *
     * ProductType에서 결제 방식을 가져와서 계산합니다.
     *
     * @param product 상품 정보
     * @param item 주문 항목
     * @return 정산 기준 금액
     */
    private long calculateSettlementAmount(Product product, OrderItem item) {
        ProductPaymentMethod paymentMethod = product.getType().getPaymentMethod();

        if (paymentMethod == ProductPaymentMethod.CANDY_ONLY) {
            // 캔디 결제: 1캔디당 환율로 환산
            long candyPrice = product.getCandyPrice() != null ? product.getCandyPrice() : 0L;
            return candyPrice * PaymentExchangeConfig.CANDY_EXCHANGE_RATE * item.getQuantity();
        } else {
            // 현금 결제: 단가 × 수량
            return item.getPrice().longValue() * item.getQuantity();
        }
    }

    /**
     * ProductType을 SettlementSourceType으로 변환합니다.
     *
     * 이 메서드는 이미 isSettlementTarget()을 통과한 상품(SETTLEMENT_CASH, SETTLEMENT_CANDY)에 대해서만 호출됩니다.
     * ProductType의 결제 방식(ProductPaymentMethod)을 기준으로 정산 원천 타입을 결정합니다:
     *
     * @param productType 상품 유형 (SETTLEMENT_CASH 또는 SETTLEMENT_CANDY)
     * @return 정산 원천 타입
     */
    private SettlementSourceType determineSourceType(ProductType productType) {
        return switch (productType.getPaymentMethod()) {
            case CASH_ONLY -> SettlementSourceType.CASH;
            case CANDY_ONLY -> SettlementSourceType.CANDY;
        };
    }
}
