package org.example.backend.settlement.batch;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.order.entity.Order;
import org.example.backend.order.repository.OrderRepository;
import org.example.backend.payment.entity.Payment;
import org.example.backend.payment.repository.PaymentRepository;
import org.example.backend.settlement.entity.SettlementFailureLog;
import org.example.backend.settlement.event.PaymentCompletedEvent;
import org.example.backend.settlement.repository.SettlementFailureLogRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 정산 데이터 복구 스케줄러
 * 결제는 성공했으나 정산 대기 데이터 생성에 실패한 건을 자동으로 복구합니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SettlementRecoveryScheduler {

    private final SettlementFailureLogRepository failureLogRepository;
    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 실패한 정산 데이터를 복구합니다.
     * 매일 새벽 2시에 실행됩니다.
     */
    @Scheduled(cron = "${settlement.recovery.cron:0 0 2 * * *}", zone = "Asia/Seoul")
    @Transactional
    public void recoverFailedSettlements() {
        log.info("정산 데이터 복구 작업 시작");

        List<SettlementFailureLog> failureLogs = failureLogRepository
                .findByIsProcessedFalseOrderByCreatedAtAsc();

        if (failureLogs.isEmpty()) {
            log.info("복구 대상 없음");
            return;
        }

        log.info("복구 대상 건수: {}", failureLogs.size());

        int successCount = 0;
        int failureCount = 0;

        for (SettlementFailureLog failureLog : failureLogs) {
            try {
                recoverSingleFailure(failureLog);
                successCount++;
            } catch (Exception e) {
                failureCount++;
                log.error("정산 데이터 복구 실패: failureLogId={}, paymentId={}, error={}",
                        failureLog.getId(), failureLog.getPaymentId(), e.getMessage(), e);
            }
        }

        log.info("정산 데이터 복구 작업 완료 - 성공: {}, 실패: {}", successCount, failureCount);
    }

    /**
     * 단일 실패 로그를 복구합니다.
     *
     * @param failureLog 실패 로그
     */
    private void recoverSingleFailure(SettlementFailureLog failureLog) {
        Long paymentId = failureLog.getPaymentId();
        Long orderId = failureLog.getOrderId();

        log.info("정산 데이터 복구 시도: paymentId={}, orderId={}", paymentId, orderId);

        // 1. Payment 조회
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalStateException(
                        "Payment not found: " + paymentId));

        // 2. Order 조회
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalStateException(
                        "Order not found: " + orderId));

        // 3. 결제 완료 이벤트 재발행
        eventPublisher.publishEvent(new PaymentCompletedEvent(this, payment, order));

        // 4. 복구 완료 처리
        failureLog.markAsProcessed();
        failureLogRepository.save(failureLog);

        log.info("정산 데이터 복구 완료: paymentId={}, orderId={}", paymentId, orderId);
    }
}
