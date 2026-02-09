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

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 정산 배치 실행 서비스
 * 관리자가 수동으로 정산 배치를 실행할 수 있도록 지원합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SettlementBatchService {

    private final JobLauncher jobLauncher;
    private final Job settlementJob;

    /**
     * 관리자 수동 정산 배치 실행
     *
     * - 동일 기간에 대해 재실행할 수 있도록 고유 타임스탬프를 JobParameter에 추가합니다.
     * - Processor 레벨의 중복 체크(existsByArtistIdAndStartDateAndEndDate)가
     *   이미 정산 완료된 아티스트를 자동으로 스킵하므로 중복 정산은 발생하지 않습니다.
     *
     * @param startDate 정산 시작일
     * @param endDate   정산 종료일
     * @return 실행 결과 응답
     */
    public ManualSettlementResponse executeManualSettlement(LocalDate startDate, LocalDate endDate) {
        log.info("========== [수동 정산] 관리자 요청 - 기간: {} ~ {} ==========", startDate, endDate);

        try {
            // 날짜 유효성 검증
            validateDateRange(startDate, endDate);

            JobParameters params = new JobParametersBuilder()
                    .addString("startDate", startDate.toString())
                    .addString("endDate", endDate.toString())
                    // 동일 기간 재실행을 허용하기 위한 고유 파라미터
                    .addString("triggeredAt", LocalDateTime.now().toString())
                    .addString("triggerType", "MANUAL")
                    .toJobParameters();

            jobLauncher.run(settlementJob, params);

            log.info("========== [수동 정산] 배치 실행 완료 - 기간: {} ~ {} ==========", startDate, endDate);
            return ManualSettlementResponse.success(startDate, endDate);

        } catch (JobExecutionAlreadyRunningException e) {
            log.warn("[수동 정산] 배치가 이미 실행 중입니다.");
            return ManualSettlementResponse.alreadyRunning();

        } catch (IllegalArgumentException e) {
            log.warn("[수동 정산] 유효성 검증 실패: {}", e.getMessage());
            return ManualSettlementResponse.failed(e.getMessage());

        } catch (Exception e) {
            log.error("========== [수동 정산] 배치 실행 실패 ==========", e);
            return ManualSettlementResponse.failed(e.getMessage());
        }
    }

    /**
     * 정산 기간 유효성 검증
     */
    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException(
                    "시작일(" + startDate + ")이 종료일(" + endDate + ")보다 늦을 수 없습니다.");
        }

        if (endDate.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException(
                    "종료일(" + endDate + ")은 오늘(" + LocalDate.now() + ") 이후일 수 없습니다.");
        }
    }
}

