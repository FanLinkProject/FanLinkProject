package org.example.backend.delivery.repository;

import org.example.backend.delivery.entity.DeliveryStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeliveryStatusHistoryRepository extends JpaRepository<DeliveryStatusHistory, Long> {

    List<DeliveryStatusHistory> findByDelivery_IdOrderByCreatedAtAsc(Long deliveryId);
}

