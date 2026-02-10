package org.example.backend.delivery.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.delivery.entity.Delivery;
import org.example.backend.delivery.enums.DeliveryStatus;
import org.example.backend.delivery.repository.DeliveryRepository;
import org.example.backend.global.integration.DeliveryTracker; // 인터페이스 사용
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DeliveryService {

    private final DeliveryRepository deliveryRepository;
    private final DeliveryTracker deliveryTracker; // 가짜가 주입됩니다 (@Primary 덕분)

    /**
     * 배송 상태 조회 (사용자가 클릭 시 호출)
     */
    @Transactional
    public String trackDelivery(Long deliveryId) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new IllegalArgumentException("배송 정보가 없습니다."));

        // 가짜 트래커가 동작하여 상태를 리턴함
        String currentStatus = deliveryTracker.getDeliveryStatus(
                delivery.getCourierCode(),
                delivery.getTrackingNumber()
        );

        // 필요하다면 DB 상태 업데이트 로직 추가
        delivery.updateStatus(DeliveryStatus.mapAfterShipStatus(currentStatus));

        return currentStatus;
    }
}