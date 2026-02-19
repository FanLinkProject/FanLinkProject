package org.example.backend.settlement.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.settlement.entity.SettlementFailureLog;
import org.example.backend.settlement.repository.SettlementFailureLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.io.PrintWriter;
import java.io.StringWriter;

/**
 * 정산 실패 로그 저장 서비스
 *
 * <p>별도 서비스로 분리한 이유:</p>
 * <ul>
 *   <li>SettlementEventListener의 REQUIRES_NEW 트랜잭션이 오염(rollback-only)된 상태에서도
 *       실패 로그를 반드시 저장해야 합니다.</li>
 *   <li>이 서비스의 메서드는 독립적인 REQUIRES_NEW 트랜잭션에서 실행되므로,
 *       호출자의 트랜잭션 상태와 무관하게 저장이 보장됩니다.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SettlementFailureLogService {

    private final SettlementFailureLogRepository failureLogRepository;

    /**
     * 정산 데이터 생성 실패 로그를 독립 트랜잭션으로 저장합니다.
     * 호출자의 트랜잭션이 rollback-only 상태여도 정상 저장됩니다.
     *
     * @param paymentId    결제 ID
     * @param orderId      주문 ID
     * @param userId       유저 ID
     * @param orderNo      주문번호
     * @param exception    발생한 예외
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveFailureLog(Long paymentId, Long orderId, Long userId,
                               String orderNo, Exception exception) {
        String stackTrace = getStackTraceAsString(exception);

        SettlementFailureLog failureLog = SettlementFailureLog.builder()
                .paymentId(paymentId)
                .orderId(orderId)
                .userId(userId)
                .orderNo(orderNo)
                .errorMessage(exception.getMessage())
                .stackTrace(stackTrace)
                .build();

        failureLogRepository.save(failureLog);

        log.info("정산 실패 로그 저장 완료: paymentId={}, failureLogId={}",
                paymentId, failureLog.getId());
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
