package org.example.backend.order.dto;

import org.example.backend.order.entity.OrderStatus;

/**
 * 주문 상태 수정 요청
 * 사용: OrderController (PUT /api/orders/{id}), OrderService.update
 */
public record OrderUpdateRequest(
        OrderStatus orderStatus
) {
}
