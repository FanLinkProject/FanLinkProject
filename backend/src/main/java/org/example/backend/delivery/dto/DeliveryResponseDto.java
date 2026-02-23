package org.example.backend.delivery.dto;

import org.example.backend.delivery.entity.Delivery;
import org.example.backend.delivery.enums.DeliveryStatus;

public record DeliveryResponseDto(
        Long deliveryId,
        String recipientName,
        String address,
        String detailAddress,
        String courierCode,    // 택배사 코드
        String trackingNumber, // 운송장 번호
        String status,         // 현재 배송 상태 (한글 설명 or Enum)
        String trackingStatus  // 트래커에서 조회한 실시간 상태 (Pending, InTransit 등)
) {
    // Entity -> DTO 변환 메서드
    public static DeliveryResponseDto from(Delivery delivery, String realtimeStatus) {
        return new DeliveryResponseDto(
                delivery.getId(),
                delivery.getRecipientName(),
                delivery.getAddress(),
                delivery.getDetailAddress(),
                delivery.getCourierCode(),
                delivery.getTrackingNumber(),
                delivery.getStatus().getDescription(), // Enum의 한글 설명 (예: "배송 중")
                realtimeStatus // 외부 API(AfterShip/SweetTracker)에서 받아온 영어 상태
        );
    }
}