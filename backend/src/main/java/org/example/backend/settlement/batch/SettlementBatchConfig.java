package org.example.backend.settlement.batch;

import jakarta.persistence.EntityManagerFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.settlement.entity.*;
import org.example.backend.settlement.repository.*;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
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
import org.springframework.transaction.PlatformTransactionManager;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

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
                .build();
    }

    @Bean
    public JpaPagingItemReader<User> artistReader() {
        return new JpaPagingItemReaderBuilder<User>()
                .name("artistReader")
                .entityManagerFactory(entityManagerFactory)
                // User 엔티티에서 role이 ARTIST인 사람만 조회
                .queryString("SELECT u FROM User u WHERE u.role = 'ARTIST' ORDER BY u.id ASC")
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

            // 대기열 조회
            List<SettlementPending> pendings = pendingRepository.findAllByArtistIdAndDateRange(
                    user.getId(), startDate.atStartOfDay(), endDate.atTime(23, 59, 59));

            // [안전장치 2] 정산할 내역이 없으면 스킵
            if (pendings.isEmpty()) return null;

            // 정산 계산 로직
            long totalSales = 0;
            long finalAmount = 0;
            List<SettlementDetail> details = new ArrayList<>();

            Settlement settlement = Settlement.builder()
                    .artistId(user.getId())
                    .startDate(startDate)
                    .endDate(endDate)
                    .totalSalesAmount(0L)
                    .feeAmount(0L)
                    .build();

            for (SettlementPending pending : pendings) {
                BigDecimal ratio = pending.getSourceType().getDefaultShareRatio();

                SettlementDetail detail = SettlementDetail.builder()
                        .settlement(settlement)
                        .paymentId(pending.getPaymentId())
                        .sourceType(pending.getSourceType())
                        .titleSnapshot(pending.getOrderName())
                        .salesAmount(pending.getAmount())
                        .shareRatio(ratio)
                        .build();

                details.add(detail);
                totalSales += pending.getAmount();
                finalAmount += detail.getSettlementAmount();
            }

            settlement.updateTotals(totalSales, totalSales - finalAmount, finalAmount);
            List<Long> pendingIds = pendings.stream().map(SettlementPending::getId).collect(Collectors.toList());

            // 반환 객체 빌더: SettlementBatchData
            return SettlementBatchData.builder()
                    .settlement(settlement)
                    .details(details)
                    .pendingIds(pendingIds)
                    .build();
        };
    }

    @Bean
    // 입력 타입: SettlementBatchData
    public ItemWriter<SettlementBatchData> settlementWriter() {
        return items -> {
            for (SettlementBatchData item : items) {
                settlementRepository.save(item.getSettlement());
                detailRepository.saveAll(item.getDetails());
                pendingRepository.deleteAllByIdIn(item.getPendingIds());
            }
        };
    }
}