package org.example.backend.settlement.batch;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.settlement.entity.SettlementFailureLog;
import org.example.backend.settlement.repository.SettlementFailureLogRepository;
import org.example.backend.settlement.service.SettlementRecoveryService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

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
    private final SettlementRecoveryService settlementRecoveryService;

    /**
     * 실패한 정산 데이터를 복구합니다.
     * 매일 새벽 2시(KST) 실행
     * (참고: 로그 확인 시 UTC 기준 전날 17:00로 찍힘)
     */
    @Scheduled(cron = "${settlement.recovery.cron:0 0 2 * * *}", zone = "Asia/Seoul")
    public void recoverFailedSettlements() {
        log.info("========== [정산 복구] 배치 시작 (KST 02:00) ==========");

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
                // Service Layer의 REQUIRES_NEW 트랜잭션을 통해 개별 독립 처리
                settlementRecoveryService.recoverSingleFailure(failureLog.getId());
                successCount++;
            } catch (Exception e) {
                failureCount++;
                log.error("정산 데이터 복구 실패: failureLogId={}, error={}", failureLog.getId(), e.getMessage());

                try {
                    // 실패 시 재시도 횟수 증가 및 에러 로그 업데이트
                    settlementRecoveryService.handleRecoveryFailure(failureLog.getId(), e.getMessage());
                } catch (Exception ex) {
                    log.error("복구 실패 처리 중 2차 오류 발생: {}", ex.getMessage());
                }
            }
        }

        log.info("정산 데이터 복구 작업 완료 - 성공: {}, 실패: {}", successCount, failureCount);
    }
}
