package org.example.backend.order.dto.request;

import jakarta.validation.constraints.NotNull;

/**
 * 캔디 전용 상품 구매 요청 DTO
 */
public record CandyOrderRequestDto(
        @NotNull Long productId,
        Integer quantity
) {
}
