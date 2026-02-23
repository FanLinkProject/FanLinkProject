package org.example.backend.delivery.repository;

import org.example.backend.delivery.entity.Delivery;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeliveryRepository extends JpaRepository<Delivery, Long> {
    // 송장번호로 배송 정보 찾기 (나중에 AfterShip webhook 등에서 사용)
    Delivery findByTrackingNumber(String trackingNumber);
}