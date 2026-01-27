package org.example.backend.settlement.batch;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.*;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.batch.core.repository.JobExecutionAlreadyRunningException;
import org.springframework.batch.core.repository.JobInstanceAlreadyCompleteException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Slf4j
@Component
@RequiredArgsConstructor
public class SettlementScheduler {

    private final JobLauncher jobLauncher;
    private final Job settlementJob;

    // 매월 15일 새벽 4시 실행
    @Scheduled(cron = "0 0 4 15 * *")
    public void runSettlementJob() {
        log.info("========== [자동 정산] 배치 시작 (매월 15일) ==========");

        LocalDate now = LocalDate.now();
        LocalDate lastMonth = now.minusMonths(1);
        LocalDate startDate = lastMonth.withDayOfMonth(1);
        LocalDate endDate = lastMonth.withDayOfMonth(lastMonth.lengthOfMonth());

        try {
            // [안전장치 3] runTime 제거 -> 동일 파라미터로 실행 시 Spring Batch가 중복 실행 차단
            JobParameters params = new JobParametersBuilder()
                    .addString("startDate", startDate.toString())
                    .addString("endDate", endDate.toString())
                    .toJobParameters();

            jobLauncher.run(settlementJob, params);

        } catch (JobExecutionAlreadyRunningException e) {
            log.warn("이미 정산 배치가 실행 중입니다.");
        } catch (JobInstanceAlreadyCompleteException e) {
            log.info("이번 달 정산 배치는 이미 완료되었습니다.");
        } catch (Exception e) {
            log.error("========== [자동 정산] 배치 실패 ==========", e);
        }
    }
}