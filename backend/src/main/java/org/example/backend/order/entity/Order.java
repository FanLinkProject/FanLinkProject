package org.example.backend.order.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Entity
@Table(name = "orders")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 비즈니스/API 노출용 고유 식별자, UUID로 중복 방지
    @Column(name = "order_id", nullable = false, unique = true)
    private String orderId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "total_amount", nullable = false)
    private Long totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "order_status", nullable = false)
    private OrderStatus orderStatus;

    // orderId는 UUID 자동 발급, orderStatus는 READY로 초기화
    public Order(Long userId, Long totalAmount) {
        this.orderId = UUID.randomUUID().toString();
        this.userId = userId;
        this.totalAmount = totalAmount;
        this.orderStatus = OrderStatus.READY;
    }

    // 결제 완료 시 호출
    public void completeOrder() {
        this.orderStatus = OrderStatus.COMPLETED;
    }

    // 주문 취소 시 호출
    public void cancelOrder() {
        this.orderStatus = OrderStatus.CANCELED;
    }

    // Controller/Service에서 임의 상태로 변경할 때 사용
    public void changeStatus(OrderStatus orderStatus) {
        this.orderStatus = orderStatus;
    }
}