package org.example.backend.delivery.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.delivery.enums.DeliveryStatus;
import org.example.backend.order.entity.Order; // Order 위치 주의

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "delivery")
public class Delivery {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "delivery_id")
    private Long id;

    @OneToOne(mappedBy = "delivery", fetch = FetchType.LAZY)
    private Order order;

    // 배송지 정보 (주문 시점에 저장됨)
    private String recipientName;
    private String recipientPhone;
    private String address;
    private String detailAddress;

    // --- AfterShip 연동 정보 (나중에 업데이트됨) ---
    private String courierCode;    // 택배사 코드 (cj-gls 등)
    private String trackingNumber; // 운송장 번호

    @Enumerated(EnumType.STRING)
    private DeliveryStatus status;

    // 생성자 (주문 시점에는 주소만 있음)
    public static Delivery createPendingDelivery(String name, String phone, String address, String detail) {
        Delivery delivery = new Delivery();
        delivery.recipientName = name;
        delivery.recipientPhone = phone;
        delivery.address = address;
        delivery.detailAddress = detail;
        delivery.status = DeliveryStatus.READY; // 기본 상태
        return delivery;
    }

    public void setOrder(Order order) {
        this.order = order;
    }

    // 송장 입력 메서드 (아티스트/관리자가 나중에 호출)
    public void startShipping(String courierCode, String trackingNumber) {
        this.courierCode = courierCode;
        this.trackingNumber = trackingNumber;
        this.status = DeliveryStatus.SHIPPING;
    }

    // 상태 업데이트
    public void updateStatus(DeliveryStatus newStatus) {
        this.status = newStatus;
    }
}