package org.example.backend.payment.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 결제 엔티티
 * 비즈니스 규칙: 단건 결제 시 product_id NOT NULL, 정기 결제 시 subscription_id NOT NULL (상호 배타)
 */
@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 토스 결제 고유 키 (환불/조회 시 필수)
    @Column(name = "payment_key", nullable = false, unique = true, length = 100)
    private String paymentKey;

    // 우리 시스템 주문 번호, 중복 방지를 위해 unique
    @Column(name = "order_id", nullable = false, unique = true, length = 64)
    private String orderId;

    // 결제 금액, 원 단위 정수 (실수형 비권장으로 Long 사용)
    @Column(nullable = false)
    private Long amount;

    // DONE, CANCELED, ABORTED 등
    @Column(nullable = false, length = 32)
    private String status;

    // SUBSCRIPTION / PRODUCT 구분
    @Column(name = "payment_type", nullable = false, length = 32)
    private String paymentType;

    // 결제 당시 상품명 스냅샷 (예: "1개월 구독권")
    @Column(name = "order_name", nullable = false, length = 255)
    private String orderName;

    // 결제 승인 일시
    @Column(name = "paid_at", nullable = false)
    private LocalDateTime paidAt;

    // 구매자 ID, 조회 성능을 위해 FK 직접 보유
    @Column(name = "user_id", nullable = false)
    private Long userId;

    // 단건 결제 시 NOT NULL (정기 결제 시에는 null)
    @Column(name = "product_id")
    private Long productId;

    // 정기 결제 시 NOT NULL (단건 결제 시에는 null)
    @Column(name = "subscription_id")
    private Long subscriptionId;
}
