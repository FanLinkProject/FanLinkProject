package org.example.backend.payment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.payment.enums.PaymentMethod;
import org.example.backend.payment.enums.PaymentStatus;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id") // 구독 결제는 Order 없이 가능
    private Long orderId;

    @Column(name = "payment_key", unique = true)
    private String paymentKey; // 토스 결제 키

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private PaymentStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMethod method; // CARD, TOSS_PAY, ...

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "order_no")
    private String orderNo;

    @Builder
    public Payment(Long userId, Long orderId, String orderNo, String paymentKey, BigDecimal amount,
            PaymentStatus status,
            PaymentMethod method,
            LocalDateTime paidAt) {
        this.userId = userId;
        this.orderId = orderId;
        this.orderNo = orderNo;
        this.paymentKey = paymentKey;
        this.amount = amount;
        this.status = status;
        this.method = method;
        this.paidAt = paidAt;
    }
}
