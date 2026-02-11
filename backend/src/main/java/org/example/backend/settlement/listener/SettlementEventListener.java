package org.example.backend.settlement.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.order.entity.Order;
import org.example.backend.payment.entity.Payment;
import org.example.backend.settlement.entity.SettlementFailureLog;
import org.example.backend.settlement.event.PaymentCompletedEvent;
import org.example.backend.settlement.repository.SettlementFailureLogRepository;
import org.example.backend.settlement.repository.SettlementPendingRepository;
import org.example.backend.settlement.service.SettlementPendingService;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.io.PrintWriter;
import java.io.StringWriter;

@Slf4j
@Component
@RequiredArgsConstructor
public class SettlementEventListener {

    private final SettlementPendingService settlementPendingService;
    private final SettlementPendingRepository settlementPendingRepository;
    private final SettlementFailureLogRepository settlementFailureLogRepository;

    /**
     * 결제 완료 이벤트를 처리하여 정산 대기 데이터를 생성합니다.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handlePaymentCompleted(PaymentCompletedEvent event) {
        Payment payment = event.getPayment();
        Order order = event.getOrder();
        Long failureLogId = event.getFailureLogId(); // 복구 컨텍스트

        log.debug("결제 완료 이벤트 수신: paymentId={}, orderId={}, isRecovery={}",
            payment.getId(), order.getId(), failureLogId != null);

        try {
            // [중복 방지] 이미 처리된 결제인지 확인
            if (settlementPendingRepository.existsByPaymentId(payment.getId())) {
                log.info("이미 정산 대기열에 존재하는 결제입니다. 스킵: paymentId={}", payment.getId());
                return;
            }

            // Service에 위임
            settlementPendingService.createSettlementPending(payment, order);

        } catch (Exception e) {
            log.error("정산 대기 데이터 생성 실패: paymentId={}, error={}", payment.getId(), e.getMessage());

            // [복구 모드]
            // 복구 중 발생한 에러는 상위(SettlementRecoveryService)로 던져서
            // 원본 FailureLog의 retryCount를 증가시키고 에러 로그를 업데이트하도록 함.
            if (failureLogId != null) {
                throw new RuntimeException("Recovery failed", e);
            }

            // [일반 모드]
            // 결제는 성공했으므로 유저에게 에러를 노출하지 않고,
            // 백그라운드 복구를 위해 FailureLog를 생성함.
            saveFailureLog(payment, order, e);
        }
    }

    /**
     * 정산 데이터 생성 실패 로그를 저장합니다.
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
            log.error("정산 실패 로그 저장 중 오류 발생 - 긴급 확인 필요! paymentId={}, error={}",
                    payment.getId(), e.getMessage(), e);
        }
    }

    private String getStackTraceAsString(Exception exception) {
        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);
        exception.printStackTrace(pw);
        String stackTrace = sw.toString();

        if (stackTrace.length() > 5000) {
            stackTrace = stackTrace.substring(0, 5000) + "... (truncated)";
        }

        return stackTrace;
    }
}
