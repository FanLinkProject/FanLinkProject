package org.example.backend.settlement.entity;

import org.example.backend.settlement.enums.SettlementSourceType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/*
 * 정산 대기열 (Temporary Storage)
 * - 역할: 결제 발생 시 실시간으로 생성되며, 실시간 매출 대시보드 조회에 사용됩니다.
 * - 수명주기: 정산 배치(Batch)가 실행되면 정산 데이터(SettlementDetail)로 변환된 후 삭제(혹은 soft delete) 되어야 합니다.
 * - 주의: 이 데이터는 최종 지급 근거가 아니며, 단순 집계용입니다.
 */

@Entity
@Getter
@EntityListeners(AuditingEntityListener.class)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "settlement_pendings", indexes = {
        @Index(name = "idx_pending_artist", columnList = "artist_id") // 조회 성능 최적화
})
public class SettlementPending {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = true)
    private Long paymentId; // 원본 결제 ID

    @Column(nullable = false)
    private Long artistId;  // 정산대상

    @Column(nullable = false)
    private Long amount;    // 결제 원금 (수수료 차감 전 금액)

    @Column(nullable = false)
    private String orderName; // 대시보드 표시용 상품명

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SettlementSourceType sourceType; // PRODUCT or CANDY

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private java.time.LocalDateTime createdAt;


    @Builder
    public SettlementPending(Long paymentId, Long artistId, Long amount, String orderName, SettlementSourceType sourceType) {
        this.paymentId = paymentId;
        this.artistId = artistId;
        this.amount = amount;
        this.orderName = orderName;
        this.sourceType = sourceType;
    }
}