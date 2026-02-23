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
    private String country;        // 국가 코드 (예: "KR", "US") - 해외/국내 판단용

    // --- 배송 추적 정보 (나중에 업데이트됨) ---
    private String courierCode;    // 택배사 코드 (cj-gls, 04 등)
    private String trackingNumber; // 운송장 번호

    @Enumerated(EnumType.STRING)
    private DeliveryStatus status;

    /**
     * 생성자 (주문 시점에는 주소만 있음)
     * 기존 코드와의 호환을 위해 주소 기반 휴리스틱으로 국가 코드를 추출합니다.
     */
    public static Delivery createPendingDelivery(String name, String phone, String address, String detail) {
        Delivery delivery = new Delivery();
        delivery.recipientName = name;
        delivery.recipientPhone = phone;
        delivery.address = address;
        delivery.detailAddress = detail;
        delivery.country = extractCountryFromAddress(address); // 주소에서 국가 추출
        delivery.status = DeliveryStatus.READY; // 기본 상태
        return delivery;
    }

    /**
     * 개선된 생성자: 명시적인 ISO 국가 코드를 받습니다.
     * countryCode 가 null/blank 인 경우에는 기존 주소 기반 휴리스틱을 사용합니다.
     */
    public static Delivery createPendingDelivery(
            String name,
            String phone,
            String address,
            String detail,
            String countryCode
    ) {
        Delivery delivery = new Delivery();
        delivery.recipientName = name;
        delivery.recipientPhone = phone;
        delivery.address = address;
        delivery.detailAddress = detail;
        if (countryCode != null && !countryCode.isBlank()) {
            delivery.country = countryCode;
        } else {
            delivery.country = extractCountryFromAddress(address);
        }
        delivery.status = DeliveryStatus.READY;
        return delivery;
    }

    /**
     * 주소에서 국가를 추출합니다.
     * 간단한 휴리스틱: 한글이 포함되어 있으면 "KR", 그 외는 "INTERNATIONAL"
     * 실제로는 더 정교한 로직이 필요할 수 있습니다.
     */
    private static String extractCountryFromAddress(String address) {
        if (address == null || address.trim().isEmpty()) {
            return "KR"; // 기본값: 국내
        }
        // 한글이 포함되어 있으면 국내로 판단
        if (address.matches(".*[가-힣]+.*")) {
            return "KR";
        }
        // 그 외는 해외로 판단 (실제로는 국가 코드를 정확히 파싱해야 함)
        return "INTERNATIONAL";
    }

    /**
     * 국내 배송 여부 확인
     */
    public boolean isDomestic() {
        return "KR".equals(country);
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