package org.example.backend.order.dto.request;

import java.util.List;

public record OrderRequestDto(
        String name,
        Long totalAmount,
        Long totalCandyAmount,
        List<OrderItemDto> orderItems,
        // 배송지정보
        String recipientName,    // 수령인 이름
        String recipientPhone,   // 수령인 전화번호
        String address,          // 주소 (예: 서울시 강남구...)
        String detailAddress,    // 상세 주소 (예: 101동 101호)
        String zipCode           // 우편번호
) {
}
