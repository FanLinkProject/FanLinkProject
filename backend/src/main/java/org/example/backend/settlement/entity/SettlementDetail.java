package org.example.backend.settlement.entity;

import org.example.backend.settlement.enums.SettlementSourceType;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;

/*
 * 정산 상세 내역 (Audit Log / Snapshot)
 * - 역할: 정산 배치 실행 시점의 데이터 상태를 '박제(Snapshot)'하여 보존합니다.
 * - 중요성: 추후 상품명이나 아티스트의 정산 비율(Rate)이 변경되더라도,
 * 이미 정산된 과거 내역은 변하지 않아야 하므로 값을 복사해서 저장합니다.
 */

@Entity
@Getter
@EntityListeners(AuditingEntityListener.class)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "settlement_details", indexes = {
        @Index(name = "idx_detail_settlement", columnList = "settlement_id") // 조회 성능 최적화
})
public class SettlementDetail {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "settlement_id", nullable = false)
    private Settlement settlement; // 부모 정산서

    @Column(nullable = false)
    private Long paymentId; // 원본 결제 ID

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SettlementSourceType sourceType;

    @Column(nullable = false)
    private String titleSnapshot; // 정산 시점의 상품명

    @Column(nullable = false)
    private Long salesAmount; // 판매 금액

    // 당시 적용된 배분율 박제: CASH=0.9(90%), CANDY=0.2(20%)
    @Column(nullable = false, precision = 3, scale = 2)
    private BigDecimal shareRatio; // 정산 시점의 적용 비율 (예: 0.9)

    @Column(nullable = false)
    private Long settlementAmount; // 최종 지급 인정액 (salesAmount * shareRatio)

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;


    @Builder
    public SettlementDetail(Settlement settlement, Long paymentId, SettlementSourceType sourceType,
                            String titleSnapshot, Long salesAmount, BigDecimal shareRatio) {
        this.settlement = settlement;
        this.paymentId = paymentId;
        this.sourceType = sourceType;
        this.titleSnapshot = titleSnapshot;
        this.salesAmount = salesAmount;
        this.shareRatio = shareRatio;
        // 정산 금액 계산 로직
        this.settlementAmount = BigDecimal.valueOf(salesAmount)
                .multiply(shareRatio)
                .setScale(0, RoundingMode.FLOOR) // 소수점 0번째 자리까지 남기고, 나머지는 버림(Floor) 처리
                .longValue();
    }
}
