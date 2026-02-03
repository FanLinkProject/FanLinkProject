package org.example.backend.settlement.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 정산 데이터 생성 실패 로그
 * 결제는 성공했으나 정산 대기 데이터 생성에 실패한 경우를 기록합니다.
 * 배치 작업에서 이 테이블을 조회하여 누락된 정산 데이터를 복구할 수 있습니다.
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "settlement_failure_logs",
    indexes = {
        @Index(name = "idx_failure_log_payment", columnList = "payment_id"),
        @Index(name = "idx_failure_log_processed", columnList = "is_processed"),
        @Index(name = "idx_failure_log_created", columnList = "created_at")
    }
)
public class SettlementFailureLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "payment_id", nullable = false)
    private Long paymentId;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "order_no", nullable = false, length = 100)
    private String orderNo;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "stack_trace", columnDefinition = "TEXT")
    private String stackTrace;

    @Column(name = "is_processed", nullable = false)
    private Boolean isProcessed = false;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public SettlementFailureLog(Long paymentId, Long orderId, Long userId,
                                 String orderNo, String errorMessage, String stackTrace) {
        this.paymentId = paymentId;
        this.orderId = orderId;
        this.userId = userId;
        this.orderNo = orderNo;
        this.errorMessage = errorMessage;
        this.stackTrace = stackTrace;
        this.isProcessed = false;
    }

    /**
     * 복구 완료 처리
     */
    public void markAsProcessed() {
        this.isProcessed = true;
        this.processedAt = LocalDateTime.now();
    }
}
