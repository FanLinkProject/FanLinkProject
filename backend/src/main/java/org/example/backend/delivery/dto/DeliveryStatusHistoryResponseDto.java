package org.example.backend.delivery.dto;

import org.example.backend.delivery.entity.DeliveryStatusHistory;

import java.time.Instant;

public record DeliveryStatusHistoryResponseDto(
        String fromStatus,
        String toStatus,
        String reason,
        Instant createdAt
) {
    public static DeliveryStatusHistoryResponseDto from(DeliveryStatusHistory history) {
        return new DeliveryStatusHistoryResponseDto(
                history.getFromStatus() != null ? history.getFromStatus().name() : null,
                history.getToStatus() != null ? history.getToStatus().name() : null,
                history.getReason(),
                history.getCreatedAt()
        );
    }
}
