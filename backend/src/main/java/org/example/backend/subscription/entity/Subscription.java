package org.example.backend.subscription.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.example.backend.global.entity.AuditableEntity;

import java.time.LocalDateTime;

@Entity
@Table(name = "subscriptions")
@Getter
@Setter
@NoArgsConstructor
public class Subscription extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "artist_id", nullable = false)
    private Long artistId;

    @Column(name = "sub_product_id", nullable = false)
    private Long subProductId;

    // 가장 최근 승인된 결제 데이터 ID
    @Column(name = "payment_id", nullable = false)
    private Long paymentId;

    // 정기 결제용 빌링 키
    @Column(name = "billing_key", nullable = false)
    private String billingKey;

    // ACTIVE, EXPIRED, CANCELED
    @Column(nullable = false, length = 32)
    private String status;

    @Column(name = "start_at", nullable = false)
    private LocalDateTime startAt;

    @Column(name = "expire_at", nullable = false)
    private LocalDateTime expireAt;

    @Column(name = "is_auto_renew", nullable = false)
    private Boolean isAutoRenew; // T: 자동 갱신, F: 기간 만료 후 종료
}
