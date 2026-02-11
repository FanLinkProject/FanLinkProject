package org.example.backend.settlement.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.order.entity.Order;
import org.example.backend.payment.entity.Payment;
import org.example.backend.settlement.event.PaymentCompletedEvent;
import org.example.backend.settlement.repository.SettlementPendingRepository;
import org.example.backend.settlement.service.SettlementFailureLogService;
import org.example.backend.settlement.service.SettlementPendingService;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class SettlementEventListener {

    private final SettlementPendingService settlementPendingService;
    private final SettlementPendingRepository settlementPendingRepository;
    private final SettlementFailureLogService failureLogService;
    private final org.example.backend.payment.repository.PaymentRepository paymentRepository;
    private final org.example.backend.order.repository.OrderRepository orderRepository;

    /**
     * 결제 완료 이벤트를 처리하여 정산 대기 데이터를 생성합니다.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handlePaymentCompleted(PaymentCompletedEvent event) {
        Long paymentId = event.getPayment().getId();
        Long orderId = event.getOrder().getId();

        log.debug("결제 완료 이벤트 수신: paymentId={}, orderId={}", paymentId, orderId);

        try {
            // [LazyInitializationException 방지]
            // 이벤트로 넘어온 엔티티는 Detached 상태일 수 있으므로, 현재 트랜잭션에서 다시 조회하여 영속화.
            Payment payment = paymentRepository.findById(paymentId)
                    .orElseThrow(() -> new IllegalStateException("Payment not found: " + paymentId));
            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new IllegalStateException("Order not found: " + orderId));

            // [중복 방지] 이미 처리된 결제인지 확인
            if (settlementPendingRepository.existsByPaymentId(paymentId)) {
                log.info("이미 정산 대기열에 존재하는 결제입니다. 스킵: paymentId={}", paymentId);
                return;
            }

            // Service에 위임
            settlementPendingService.createSettlementPending(payment, order);

        } catch (Exception e) {
            log.error("정산 대기 데이터 생성 실패: paymentId={}, error={}", paymentId, e.getMessage());

            // [독립 트랜잭션] 메인 트랜잭션이 rollback-only 상태여도 별도 트랜잭션에서 저장
            try {
                failureLogService.saveFailureLog(
                        event.getPayment().getId(),
                        event.getOrder().getId(),
                        event.getPayment().getUserId(),
                        event.getOrder().getOrderNo(),
                        e
                );
            } catch (Exception ex) {
                log.error("정산 실패 로그 저장 중 오류 발생 - 긴급 확인 필요! paymentId={}, error={}",
                        paymentId, ex.getMessage(), ex);
            }
        }
    }
}
