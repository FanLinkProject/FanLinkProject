package org.example.backend.settlement.entity;

import org.example.backend.global.entity.BaseTimeEntity;
import org.example.backend.settlement.enums.SettlementStatus;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "settlements", indexes = {
        @Index(name = "idx_settlement_artist", columnList = "artist_id") // 조회 성능 최적화
})
public class Settlement extends BaseTimeEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long artistId;

    @Column(nullable = false)
    private LocalDate startDate; // 정산 집계 시작일

    @Column(nullable = false)
    private LocalDate endDate;   // 정산 집계 종료일

    @Column(nullable = false)
    private Long totalSalesAmount; // 총 매출

    @Column(nullable = false)
    private Long feeAmount;        // 수수료

    @Column(nullable = false)
    private Long finalAmount;      // 최종 지급액

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SettlementStatus status;

    @Column(nullable = false)
    private LocalDateTime settledAt; //지급 일시 : 정산 배치 이후 바로 지급 가정(테스트 결제이므로 실제 송금 로직 구현 x)

    @Builder
    public Settlement(Long artistId, LocalDate startDate, LocalDate endDate,
                      Long totalSalesAmount, Long feeAmount) {
        this.artistId = artistId;
        this.startDate = startDate;
        this.endDate = endDate;
        this.totalSalesAmount = totalSalesAmount;
        this.feeAmount = feeAmount;
        this.finalAmount = totalSalesAmount - feeAmount;

        // 생성되자마자 '지급 완료' 상태로 설정
        this.status = SettlementStatus.COMPLETE;
        this.settledAt = LocalDateTime.now();
    }

    public void updateTotals(Long totalSalesAmount, Long feeAmount, Long finalAmount) {
        this.totalSalesAmount = totalSalesAmount;
        this.feeAmount = feeAmount;
        this.finalAmount = finalAmount;
    }
}