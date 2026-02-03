package org.example.backend.order.dto.request;

public record OrderItemDto(
        Long productId,
        Integer quantity) {
}
