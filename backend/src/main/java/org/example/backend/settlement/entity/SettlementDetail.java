package org.example.backend.settlement.entity;

import org.example.backend.settlement.enums.SettlementSourceType;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;

/*
* 정산 상세 : 정산 대기중에 있던 내역중 정산 배치 완료 후 데이터 보존 용도
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
    private String titleSnapshot; // 당시 상품명 (이력 보존)

    @Column(nullable = false)
    private Long salesAmount; // 판매 금액

    // 당시 적용된 배분율 박제 (0.9 or 0.2)
    @Column(nullable = false, precision = 3, scale = 2)
    private BigDecimal shareRatio;

    @Column(nullable = false)
    private Long settlementAmount; // 아티스트 지급 인정액 (매출 * 비율)

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private java.time.LocalDateTime createdAt;


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
                .longValue();
    }
}