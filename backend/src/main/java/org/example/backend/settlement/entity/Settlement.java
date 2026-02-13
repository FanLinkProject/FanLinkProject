package org.example.backend.settlement.entity;

import org.example.backend.settlement.enums.SettlementStatus;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.time.LocalDate;

/*
 * 정산서 (Settlement Statement)
 * - 역할: 특정 기간(startDate ~ endDate) 동안의 정산 집계 결과입니다.
 * - 상태: 생성 시점(COMPLETE) 이후에는 원칙적으로 데이터가 변경되지 않아야 합니다.
 * - 관계: 하나의 정산서는 여러 개의 상세 내역(SettlementDetail)을 가집니다.
 */

@Entity
@Getter
@EntityListeners(AuditingEntityListener.class)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "settlements", indexes = {
        @Index(name = "idx_settlement_artist", columnList = "artist_id") // 조회 성능 최적화
})
public class Settlement {

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
    private Long feeAmount;        // 플랫폼 수수료 (총 매출 - 최종 지급액)

    @Column(nullable = false)
    private Long finalAmount;      // 실 지급액 (Artist Wallet으로 송금될 금액)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SettlementStatus status;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private Instant updatedAt;


    @Column(nullable = false)
    private Instant settledAt; //지급 일시 : 정산 배치 이후 바로 지급 가정(테스트 결제이므로 실제 송금 로직 구현 x)

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
        this.settledAt = Instant.now();
    }
    // 기본적으로 정산서는 생성후 수정 x
    // 해당 메서드는 재정산 로직 구현부 사용
    public void updateTotals(Long totalSalesAmount, Long feeAmount, Long finalAmount) {
        this.totalSalesAmount = totalSalesAmount;
        this.feeAmount = feeAmount;
        this.finalAmount = finalAmount;
    }
}
