package org.example.backend.global.integration;

public interface DeliveryTracker {
    /**
     * 운송장 번호와 택배사 코드를 받아 현재 배송 상태를 반환
     * @param courierCode 택배사 코드
     * @param trackingNumber 운송장 번호
     * @return 배송 상태 문자열 (Pending, InTransit, Delivered 등)
     */
    String getDeliveryStatus(String courierCode, String trackingNumber);

    /**
     * ★ 전략 패턴 핵심 ★
     * 해당 택배사 코드를 이 트래커가 처리할 수 있는지 확인하는 메서드입니다.
     * @param courierCode 택배사 코드
     * @return 지원하면 true, 아니면 false
     */
    boolean isSupported(String courierCode);
}