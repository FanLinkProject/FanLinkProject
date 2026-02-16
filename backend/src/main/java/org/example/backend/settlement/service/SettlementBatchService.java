package org.example.backend.settlement.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.settlement.dto.response.ManualSettlementResponse;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.JobParametersBuilder;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.batch.core.repository.JobExecutionAlreadyRunningException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * 정산 배치 실행 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SettlementBatchService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final JobLauncher jobLauncher;
    private final Job settlementJob;

    /**
     * 관리자 수동 정산 배치 실행
     */
    public ManualSettlementResponse executeManualSettlement(LocalDate startDate, LocalDate endDate) {
        log.info("========== [수동 정산] 관리자 요청 - 기간: {} ~ {} =========", startDate, endDate);

        try {
            validateDateRange(startDate, endDate);

            JobParameters params = new JobParametersBuilder()
                    .addString("startDate", startDate.toString())
                    .addString("endDate", endDate.toString())
                    .addString("triggeredAt", Instant.now().toString())
                    .addString("triggerType", "MANUAL")
                    .toJobParameters();

            jobLauncher.run(settlementJob, params);

            log.info("========== [수동 정산] 배치 실행 완료 - 기간: {} ~ {} =========", startDate, endDate);
            return ManualSettlementResponse.success(startDate, endDate);

        } catch (JobExecutionAlreadyRunningException e) {
            log.warn("[수동 정산] 배치가 이미 실행 중입니다.");
            return ManualSettlementResponse.alreadyRunning();

        } catch (IllegalArgumentException e) {
            log.warn("[수동 정산] 유효성 검증 실패: {}", e.getMessage());
            return ManualSettlementResponse.failed(e.getMessage());

        } catch (Exception e) {
            log.error("========== [수동 정산] 배치 실행 실패 =========", e);
            return ManualSettlementResponse.failed(e.getMessage());
        }
    }

    /**
     * 정산 기간 유효성 검증 (KST 기준)
     */
    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        LocalDate todayKst = LocalDate.now(KST);

        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException(
                    "시작일(" + startDate + ")은 종료일(" + endDate + ")보다 늦을 수 없습니다.");
        }

        if (endDate.isAfter(todayKst)) {
            throw new IllegalArgumentException(
                    "종료일(" + endDate + ")은 오늘(" + todayKst + ") 이후일 수 없습니다.");
        }
    }
}
