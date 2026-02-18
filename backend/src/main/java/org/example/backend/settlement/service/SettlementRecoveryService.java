package org.example.backend.settlement.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.order.entity.Order;
import org.example.backend.order.repository.OrderRepository;
import org.example.backend.payment.entity.Payment;
import org.example.backend.payment.repository.PaymentRepository;
import org.example.backend.settlement.entity.SettlementFailureLog;

import org.example.backend.settlement.repository.SettlementFailureLogRepository;
import org.example.backend.settlement.repository.SettlementPendingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class SettlementRecoveryService {

    private final SettlementFailureLogRepository failureLogRepository;
    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final SettlementPendingRepository settlementPendingRepository;
    private final SettlementPendingService settlementPendingService;

    /**
     * 단일 실패 로그를 복구합니다.
     * REQUIRES_NEW 트랜잭션으로 실행되어 개별 복구 실패가 전체에 영향을 주지 않습니다.
     *
     * @param failureLogId 실패 로그 ID
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recoverSingleFailure(Long failureLogId) {
        // 0. DB에서 최신 상태 조회 (중복 처리 방지)
        SettlementFailureLog failureLog = failureLogRepository.findById(failureLogId)
                .orElseThrow(() -> new IllegalStateException(
                        "FailureLog not found: " + failureLogId));

        Long paymentId = failureLog.getPaymentId();
        Long orderId = failureLog.getOrderId();

        log.info("정산 데이터 복구 시도: paymentId={}, orderId={}, retryCount={}",
                paymentId, orderId, failureLog.getRetryCount());

        // 1. 중복 처리 방지
        if (failureLog.getIsProcessed()) {
            log.info("이미 처리된 복구 작업 스킵: failureLogId={}, paymentId={}",
                    failureLogId, paymentId);
            return;
        }

        // 2. Payment 조회
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalStateException(
                        "Payment not found: " + paymentId));

        // 3. Order 조회
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalStateException(
                        "Order not found: " + orderId));

        // 3-1. [데이터 정합성] 이미 정산 대기열에 존재하는지 재확인 (멱등성 보장)
        if (settlementPendingRepository.existsByPaymentId(paymentId)) {
            log.warn("이미 정산 대기열에 존재함 (복구 중복 방지): paymentId={}", paymentId);
            failureLog.markAsProcessed();
            failureLogRepository.save(failureLog);
            return;
        }

        // 4. 정산 대기 데이터 생성 (직접 호출)
        // EventListener를 거치지 않고 직접 Service를 호출하여 동기적으로 처리
        // 예외 발생 시 트랜잭션 롤백 -> markAsProcessed도 롤백됨 (데이터 유실 방지)
        settlementPendingService.createSettlementPending(payment, order);

        // 5. 복구 완료 처리
        failureLog.markAsProcessed();
        failureLogRepository.save(failureLog);

        log.info("정산 데이터 복구 완료: paymentId={}, orderId={}", paymentId, orderId);
    }

    /**
     * 복구 실패 시 재시도 횟수 증가 및 에러 로그 업데이트
     *
     * @param failureLogId 실패 로그 ID
     * @param errorMessage 에러 메시지
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleRecoveryFailure(Long failureLogId, String errorMessage) {
        SettlementFailureLog failureLog = failureLogRepository.findById(failureLogId)
                .orElseThrow(() -> new IllegalStateException(
                        "FailureLog not found: " + failureLogId));

        failureLog.incrementRetryCount();
        failureLog.updateErrorMessage(errorMessage);

        // 최대 재시도 횟수 초과 시 포기
        if (failureLog.getRetryCount() >= 5) {
            failureLog.markAsAbandoned();
            log.error("복구 포기 (최대 재시도 초과): failureLogId={}", failureLogId);
        }

        failureLogRepository.save(failureLog);
    }
}
