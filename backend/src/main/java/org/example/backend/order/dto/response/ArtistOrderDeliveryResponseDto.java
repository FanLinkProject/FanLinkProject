package org.example.backend.order.dto.response;

import org.example.backend.order.entity.Order;

import java.math.BigDecimal;
import java.time.Instant;

public record ArtistOrderDeliveryResponseDto(
        Long orderId,
        String orderNo,
        String orderName,
        BigDecimal totalAmount,
        String orderStatus,
        Instant orderedAt,
        Long deliveryId,
        String deliveryStatus,
        String courierCode,
        String trackingNumber
) {
    public static ArtistOrderDeliveryResponseDto from(Order order) {
        return new ArtistOrderDeliveryResponseDto(
                order.getId(),
                order.getOrderNo(),
                order.getName(),
                order.getTotalAmount(),
                order.getStatus().name(),
                order.getCreatedAt(),
                order.getDelivery() != null ? order.getDelivery().getId() : null,
                order.getDelivery() != null && order.getDelivery().getStatus() != null
                        ? order.getDelivery().getStatus().name()
                        : null,
                order.getDelivery() != null ? order.getDelivery().getCourierCode() : null,
                order.getDelivery() != null ? order.getDelivery().getTrackingNumber() : null
        );
    }
}
