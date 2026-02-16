package org.example.backend.settlement.entity;

import org.example.backend.settlement.enums.SettlementSourceType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

/*
 * 정산 대기열 (Temporary Storage)
 * - 역할: 결제가 완료되면 생성되고, 배치 시 정산 상세로 전환 후 삭제됩니다.
 */
@Entity
@Getter
@EntityListeners(AuditingEntityListener.class)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "settlement_pendings",
        indexes = {
                @Index(name = "idx_pending_artist", columnList = "artist_id"),
                @Index(name = "idx_pending_artist_paid_at", columnList = "artist_id, paid_at")
        },
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_pending_payment_artist_item",
                        columnNames = {"payment_id", "artist_id", "order_name"}
                )
        }
)
public class SettlementPending {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long paymentId;

    @Column(nullable = false)
    private Long artistId;

    @Column(nullable = false)
    private Long amount;

    @Column(nullable = false)
    private String orderName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SettlementSourceType sourceType;

    @Column(nullable = false)
    private Instant paidAt;   // 결제 완료 시각 (정산 기간 기준)

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Builder
    public SettlementPending(Long paymentId, Long artistId, Long amount, String orderName,
                             SettlementSourceType sourceType, Instant paidAt) {
        this.paymentId = paymentId;
        this.artistId = artistId;
        this.amount = amount;
        this.orderName = orderName;
        this.sourceType = sourceType;
        this.paidAt = paidAt;
    }
}
