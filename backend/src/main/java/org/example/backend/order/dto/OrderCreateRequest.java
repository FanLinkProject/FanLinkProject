package org.example.backend.order.dto;

/**
 * 주문 생성 요청
 * 사용: OrderController (POST /api/orders), OrderService.create
 * orderId, orderStatus는 엔티티 생성 시 자동 설정
 */
public record OrderCreateRequest(
        Long userId,
        Long totalAmount
) {
}
