package org.example.backend.delivery.repository;

import org.example.backend.delivery.entity.Delivery;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DeliveryRepository extends JpaRepository<Delivery, Long> {
    Optional<Delivery> findByIdAndOrderUserId(Long id, Long userId);

    Optional<Delivery> findByTrackingNumber(String trackingNumber);

    Optional<Delivery> findByTrackingNumberAndCourierCode(String trackingNumber, String courierCode);
}
