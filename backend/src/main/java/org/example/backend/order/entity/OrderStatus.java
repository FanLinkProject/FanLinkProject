package org.example.backend.order.entity;

public enum OrderStatus {
    // 주문 대기
    READY,
    // 결제/주문 완료
    COMPLETED,
    // 취소됨
    CANCELED
}