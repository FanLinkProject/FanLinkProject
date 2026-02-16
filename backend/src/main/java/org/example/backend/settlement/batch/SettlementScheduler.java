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
import java.time.ZoneId;

/**
 * [정산 스케줄러]
 * 배치를 트리거하는 역할을 수행합니다.
 * - 일정: 매월 15일 새벽 4시 실행.
 * - 기능: 실행 시점의 날짜를 계산하여 JobParameter로 주입하며,
 * Spring Batch의 중복 실행 방지 메커니즘을 활용.
 */

@Slf4j
@Component
@RequiredArgsConstructor
public class SettlementScheduler {

    private final JobLauncher jobLauncher;
    private final Job settlementJob;

    // 매월 15일 새벽 4시 실행(KST)
//    @Scheduled(cron = "${settlement.batch.cron}", zone = "Asia/Seoul")
    @Scheduled(cron = "0 0/3 * * * *", zone = "Asia/Seoul")
    public void runSettlementJob() {
        log.info("========== [자동 정산] 배치 시작 (KST): 15일 04:00, (UTC) : 14일 19:00 ==========");

        LocalDate now = LocalDate.now(ZoneId.of("Asia/Seoul"));
        LocalDate lastMonth = now.minusMonths(1);
        LocalDate startDate = lastMonth.withDayOfMonth(1);
        LocalDate endDate = lastMonth.withDayOfMonth(lastMonth.lengthOfMonth());

        try {
            JobParameters params = new JobParametersBuilder()
                    .addString("startDate", startDate.toString())
                    .addString("endDate", endDate.toString())
                    .addLong("testTimestamp", System.currentTimeMillis())
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