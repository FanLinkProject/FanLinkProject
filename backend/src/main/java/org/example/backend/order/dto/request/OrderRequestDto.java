package org.example.backend.order.dto.request;

import java.util.List;

public record OrderRequestDto(
        String name,
        Long totalAmount,
        Long totalCandyAmount,
        List<OrderItemDto> orderItems) {
}
