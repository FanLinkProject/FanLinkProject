package org.example.backend.settlement.entity;

import org.example.backend.global.entity.BaseTimeEntity;
import org.example.backend.settlement.enums.SettlementSourceType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/*
* 정산 대기열 : 결제가 발생할 때 생성되는 임시데이터, 실시간 대시보드 조회용
* 정산 배치 돌면 삭제되거나 처리됨 상태로 변경
*/

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "settlement_pendings", indexes = {
        @Index(name = "idx_pending_artist", columnList = "artist_id") // 조회 성능 최적화
})
public class SettlementPending extends BaseTimeEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long paymentId; // 원본 결제 ID

    @Column(nullable = false)
    private Long artistId;  // 정산대상

    @Column(nullable = false)
    private Long amount;    // 결제 금액

    @Column(nullable = false)
    private String orderName; // 대시보드 표시용 상품명

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SettlementSourceType sourceType; // PRODUCT or CANDY

    @Builder
    public SettlementPending(Long paymentId, Long artistId, Long amount, String orderName, SettlementSourceType sourceType) {
        this.paymentId = paymentId;
        this.artistId = artistId;
        this.amount = amount;
        this.orderName = orderName;
        this.sourceType = sourceType;
    }
}