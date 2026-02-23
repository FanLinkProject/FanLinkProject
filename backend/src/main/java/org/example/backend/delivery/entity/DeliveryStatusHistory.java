package org.example.backend.delivery.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.delivery.enums.DeliveryStatus;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Table(
        name = "delivery_status_history",
        indexes = {
                @Index(name = "idx_delivery_status_history_delivery_created", columnList = "delivery_id,created_at")
        }
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class DeliveryStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "delivery_id", nullable = false)
    private Delivery delivery;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", nullable = false, length = 32)
    private DeliveryStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 32)
    private DeliveryStatus toStatus;

    @Column(name = "reason", length = 255)
    private String reason;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static DeliveryStatusHistory of(
            Delivery delivery,
            DeliveryStatus fromStatus,
            DeliveryStatus toStatus,
            String reason
    ) {
        return DeliveryStatusHistory.builder()
                .delivery(delivery)
                .fromStatus(fromStatus)
                .toStatus(toStatus)
                .reason(reason)
                .build();
    }
}
