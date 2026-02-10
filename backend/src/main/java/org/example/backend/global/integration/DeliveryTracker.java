package org.example.backend.global.integration;

public interface DeliveryTracker {
    /**
     * 운송장 번호와 택배사 코드를 받아 현재 배송 상태를 반환
     * @param courierCode 택배사 코드
     * @param trackingNumber 운송장 번호
     * @return 배송 상태 문자열 (Pending, InTransit, Delivered 등)
     */
    String getDeliveryStatus(String courierCode, String trackingNumber);
}