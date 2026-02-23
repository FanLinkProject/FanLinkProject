package org.example.backend.order.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.delivery.entity.Delivery;
import org.example.backend.order.enums.OrderStatus;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "total_amount", nullable = false)
    private BigDecimal totalAmount; // 총 현금 결제 금액

    @Column(name = "total_candy_amount", nullable = false)
    private Long totalCandyAmount; // 총 Candy 사용 금액

    @Column(nullable = false)
    private String name; // 주문명 (예: "상품A 외 2건")

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> orderItems = new ArrayList<>();

    // 배송 정보와의 1:1 관계 설정
    // 이유: 주문이 저장될 때 배송 정보도 같이 저장(CascadeType.ALL)되어야 하고, 주문을 불러올 때 배송 정보도 필요하기 때문입니다.
    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JoinColumn(name = "delivery_id")
    private Delivery delivery;

    @Column(nullable = false, unique = true)
    private String orderNo; // 결제 요청용 고유 주문 번호 (UUID)

    // Builder 패턴에 delivery 파라미터 추가
    // 이유: 주문 생성 시점에 배송 정보도 함께 받아야 완전한 주문 객체가 생성되기 때문입니다.
    @Builder
    public Order(Long userId, BigDecimal totalAmount, Long totalCandyAmount, String name, OrderStatus status,
            String orderNo, Delivery delivery) {
        this.userId = userId;
        this.totalAmount = totalAmount;
        this.totalCandyAmount = totalCandyAmount;
        this.name = name;
        this.status = status;
        this.orderNo = (orderNo != null) ? orderNo : java.util.UUID.randomUUID().toString();
        this.setDelivery(delivery); // 연관관계 편의 메서드 호출
    }

    public void addOrderItem(OrderItem orderItem) {
        this.orderItems.add(orderItem);
        orderItem.assignOrder(this);
    }

    // 연관관계 편의 메서드
    // 이유: Order와 Delivery가 서로를 참조할 때 데이터 불일치를 막기 위해 양쪽 다 값을 세팅해줍니다.
    public void setDelivery(Delivery delivery) {
        this.delivery = delivery;
        if (delivery != null) {
            delivery.setOrder(this);
        }
    }

    public void updateStatus(OrderStatus status) {
        this.status = status;
    }
}
