package org.example.backend.settlement.batch;

import jakarta.persistence.EntityManagerFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.settlement.entity.*;
import org.example.backend.settlement.repository.*;
import org.example.backend.user.entity.User;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.configuration.annotation.StepScope;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.item.ItemProcessor;
import org.springframework.batch.item.ItemWriter;
import org.springframework.batch.item.database.JpaPagingItemReader;
import org.springframework.batch.item.database.builder.JpaPagingItemReaderBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.dao.DeadlockLoserDataAccessException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.transaction.PlatformTransactionManager;

import java.math.BigDecimal;
import java.net.SocketTimeoutException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * [정산 배치 설정]
 * - 흐름: Reader(정산 대상 조회) -> Processor(집계 및 계산) -> Writer(저장 및 정리)
 * - 정산 대상: ARTIST(개별 아티스트) + GROUP(그룹 공용 계정)
 */

@Slf4j
@Configuration
@RequiredArgsConstructor
public class SettlementBatchConfig {

    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;
    private final EntityManagerFactory entityManagerFactory;

    private final SettlementPendingRepository pendingRepository;
    private final SettlementRepository settlementRepository;
    private final SettlementDetailRepository detailRepository;

    @Bean
    public Job settlementJob() {
        return new JobBuilder("settlementJob", jobRepository)
                .start(settlementStep())
                .build();
    }

    @Bean
    public Step settlementStep() {
        return new StepBuilder("settlementStep", jobRepository)
                .<User, SettlementBatchData>chunk(10, transactionManager)
                .reader(artistReader())
                .processor(settlementProcessor(null, null))
                .writer(settlementWriter())

                // --- 재시도 로직 ---
                .faultTolerant() // 내결함성 기능 활성화

                .retryLimit(3)   // 에러 발생 시 최대 3번까지 다시 시도
                .retry(OptimisticLockingFailureException.class) // DB 낙관적 락 에러 시 재시도
                .retry(DeadlockLoserDataAccessException.class)  // 데드락 발생 시 재시도
                .retry(SocketTimeoutException.class)           // 네트워크 타임아웃 시 재시도

                .skipLimit(10)   // 특정 데이터 에러 시 최대 10건까지는 건너뜀
                .skip(IllegalArgumentException.class) // 비즈니스 로직 에러 시 해당 아티스트만 스킵

                .build();
    }

    @Bean
    public JpaPagingItemReader<User> artistReader() {
        return new JpaPagingItemReaderBuilder<User>()
                .name("artistReader")
                .entityManagerFactory(entityManagerFactory)
                // 정산 대상: ARTIST(개별 아티스트) + GROUP(그룹 공용 계정) 모두 조회 (ID순 정렬 필수)
                .queryString("SELECT u FROM User u WHERE u.role IN ('ARTIST', 'GROUP') ORDER BY u.id ASC")
                .pageSize(10)
                .build();
    }

    @Bean
    @StepScope
    // 반환 타입: SettlementBatchData
    public ItemProcessor<User, SettlementBatchData> settlementProcessor(
            @Value("#{jobParameters['startDate']}") String startDateStr,
            @Value("#{jobParameters['endDate']}") String endDateStr
    ) {
        return user -> {
            LocalDate startDate = LocalDate.parse(startDateStr);
            LocalDate endDate = LocalDate.parse(endDateStr);

            // [안전장치 1] 이미 정산 완료된 아티스트인지 체크 (중복 실행 방지)
            boolean alreadySettled = settlementRepository.existsByArtistIdAndStartDateAndEndDate(
                    user.getId(), startDate, endDate
            );
            if (alreadySettled) {
                log.info("Artist({})는 이미 {}~{} 정산이 완료되었습니다.", user.getId(), startDate, endDate);
                return null; // Writer로 넘기지 않고 스킵
            }

            // 대기열 조회 (반개방 구간: startDate 00:00:00 이상 ~ endDate+1 00:00:00 미만)
            Instant start = startDate.atStartOfDay(ZoneId.of("Asia/Seoul")).toInstant();
            Instant end = endDate.plusDays(1).atStartOfDay(ZoneId.of("Asia/Seoul")).toInstant();
            List<SettlementPending> pendings = pendingRepository.findAllByArtistIdAndDateRange(
                    user.getId(), start, end);

            // [안전장치 2] 정산할 내역이 없으면 스킵
            if (pendings.isEmpty()) return null;

            // 정산 집계 변수 초기화
            long totalSales = 0;
            long finalAmount = 0;
            List<SettlementDetail> details = new ArrayList<>();

            // 정산서 객체 생성 (금액은 0원으로 초기화해두고 아래에서 update)
            Settlement settlement = Settlement.builder()
                    .artistId(user.getId())
                    .startDate(startDate)
                    .endDate(endDate)
                    .totalSalesAmount(0L)
                    .feeAmount(0L)
                    .build();

            for (SettlementPending pending : pendings) {
                BigDecimal ratio = pending.getSourceType().getDefaultShareRatio();


                // SettlementDetail의 @Builder(생성자) 내부에서
                // .setScale(0, RoundingMode.FLOOR)가 실행되어 '버림' 처리된 금액이 생성됩니다.
                SettlementDetail detail = SettlementDetail.builder()
                        .settlement(settlement)
                        .paymentId(pending.getPaymentId())
                        .sourceType(pending.getSourceType())
                        .titleSnapshot(pending.getOrderName())
                        .salesAmount(pending.getAmount()) // 정산 기준금 (캔디의 경우 -> 환율 반영된 KRW 금액)
                        .shareRatio(ratio)
                        .build();

                details.add(detail);

                totalSales += pending.getAmount();

                // finalAmount는 배치에서 별도로 계산하지 않고,
                // Entity가 계산 완료한 값(detail.getSettlementAmount)을 신뢰하여 합산합니다.
                // 이를 통해 Entity와 Batch 간의 계산 로직 불일치 가능성을 0%로 만듭니다.
                finalAmount += detail.getSettlementAmount();
            }

            // 집계된 총액을 정산서에 반영 (매출액, 수수료, 실지급액)
            settlement.updateTotals(totalSales, totalSales - finalAmount, finalAmount);

            // 처리 완료된 대기열 ID 리스트 추출
            List<Long> pendingIds = pendings.stream().map(SettlementPending::getId).collect(Collectors.toList());

            // Writer로 전달
            return SettlementBatchData.builder()
                    .settlement(settlement)
                    .details(details)
                    .pendingIds(pendingIds)
                    .build();
        };
    }

    @Bean
    public ItemWriter<SettlementBatchData> settlementWriter() {
        return items -> {
            for (SettlementBatchData item : items) {
                // 1. 정산서 저장 (ID 생성)
                settlementRepository.save(item.getSettlement());

                // 2. 상세 내역 저장
                detailRepository.saveAll(item.getDetails());

                // 3. 처리된 대기열 삭제 (Clean up)
                pendingRepository.deleteAllByIdIn(item.getPendingIds());
            }
        };
    }
}
