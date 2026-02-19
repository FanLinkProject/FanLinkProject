package org.example.backend.settlement.listener;

import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.BatchStatus;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.JobExecutionListener;
import org.springframework.batch.core.StepExecution;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Slf4j
@Component
public class SettlementJobExecutionListener implements JobExecutionListener {

    @Override
    public void beforeJob(JobExecution jobExecution) {
        String startDate = jobExecution.getJobParameters().getString("startDate");
        String endDate = jobExecution.getJobParameters().getString("endDate");
        String triggerType = jobExecution.getJobParameters().getString("triggerType");

        log.info("========================================");
        log.info("[정산 배치 시작]");
        log.info("정산 기간: {} ~ {}", startDate, endDate);
        log.info("실행 유형: {}", triggerType != null ? triggerType : "AUTO");
        log.info("생성 시각: {}", jobExecution.getCreateTime());
        log.info("========================================");
    }

    @Override
    public void afterJob(JobExecution jobExecution) {
        String startDate = jobExecution.getJobParameters().getString("startDate");
        String endDate = jobExecution.getJobParameters().getString("endDate");

        long readCount = 0L;
        long writeCount = 0L;
        long skipCount = 0L;
        long filterCount = 0L;

        for (StepExecution stepExecution : jobExecution.getStepExecutions()) {
            readCount += stepExecution.getReadCount();
            writeCount += stepExecution.getWriteCount();
            skipCount += stepExecution.getReadSkipCount() + stepExecution.getWriteSkipCount();
            filterCount += stepExecution.getFilterCount();
        }

        String status = jobExecution.getStatus().name();
        String exitCode = jobExecution.getExitStatus().getExitCode();

        log.info("========================================");
        log.info("[정산 배치 종료]");
        log.info("정산 기간: {} ~ {}", startDate, endDate);
        log.info("실행 상태: {} ({})", status, exitCode);
        log.info("----------------------------------------");
        log.info("전체 조회 대상: {} (아티스트/그룹 합계)", readCount);
        log.info("정산서 생성: {} 건", writeCount);

        if (filterCount > 0) {
            log.info("정산 대상 없음: {} 건 (해당 기간 내 정산 대기 데이터 없음)", filterCount);
        }

        if (skipCount > 0) {
            log.warn("스텝 오류 발생: {} 건 (배치 로그 확인 필요)", skipCount);
        }

        log.info("----------------------------------------");

        if (jobExecution.getStatus() == BatchStatus.COMPLETED) {
            log.info("정산 배치가 정상 완료되었습니다.");
        } else if (jobExecution.getStatus() == BatchStatus.FAILED) {
            String errorMessage = jobExecution.getAllFailureExceptions().isEmpty()
                    ? "Unknown"
                    : jobExecution.getAllFailureExceptions().get(0).getMessage();
            log.error("정산 배치가 실패했습니다. 원인: {}", errorMessage);
        } else if (jobExecution.getStatus() == BatchStatus.STOPPED) {
            log.warn("정산 배치가 중단되었습니다.");
        }

        if (jobExecution.getStartTime() != null && jobExecution.getEndTime() != null) {
            long durationMillis = Duration.between(jobExecution.getStartTime(), jobExecution.getEndTime()).toMillis();
            long seconds = durationMillis / 1000;

            if (seconds < 60) {
                log.info("소요 시간: {}초", seconds);
            } else {
                long minutes = seconds / 60;
                long remainingSeconds = seconds % 60;
                log.info("소요 시간: {}분 {}초", minutes, remainingSeconds);
            }
        }

        log.info("========================================");
    }
}