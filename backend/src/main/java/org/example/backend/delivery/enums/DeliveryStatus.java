package org.example.backend.delivery.enums;

import lombok.Getter;

@Getter
public enum DeliveryStatus {
    READY("배송 준비 중"),       // 결제 완료, 송장 미등록
    SHIPPING("배송 중"),         // 송장 등록됨, 이동 중
    DELIVERED("배송 완료"),      // 도착
    ISSUE("배송 이슈 발생"),      // 반송, 분실 등
    UNKNOWN("정보 없음");

    private final String description;

    DeliveryStatus(String description) {
        this.description = description;
    }

    // AfterShip 상태를 우리 서비스 상태로 변환
    public static DeliveryStatus mapAfterShipStatus(String rawStatus) {
        if (rawStatus == null) return UNKNOWN;

        switch (rawStatus) {
            case "Pending":
            case "InfoReceived":
                return READY;
            case "InTransit":
            case "OutForDelivery":
            case "AttemptFail":
                return SHIPPING;
            case "Delivered":
                return DELIVERED;
            case "Exception":
            case "Expired":
                return ISSUE;
            default:
                return UNKNOWN;
        }
    }
}