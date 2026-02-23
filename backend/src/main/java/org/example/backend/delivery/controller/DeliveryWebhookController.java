package org.example.backend.delivery.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.delivery.entity.Delivery;
import org.example.backend.delivery.enums.DeliveryStatus;
import org.example.backend.delivery.exception.DeliveryErrorCode;
import org.example.backend.delivery.exception.DeliveryException;
import org.example.backend.delivery.repository.DeliveryRepository;
import org.example.backend.delivery.service.DeliveryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 외부 배송 서비스(예: AfterShip)에서 호출하는 Webhook 엔드포인트.
 * 공식 스펙과 1:1 매핑이라기보다는, 현재 서비스에 맞춘 경량 형태의 Webhook 입니다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/deliveries/webhook")
public class DeliveryWebhookController {

    private final DeliveryRepository deliveryRepository;
    private final DeliveryService deliveryService;

    /**
     * AfterShip 스타일의 webhook 예시:
     *  - trackingNumber: 운송장 번호
     *  - courierCode: 택배사 코드
     *  - tag: AfterShip tag (Pending, InTransit, Delivered, Exception 등)
     */
    @PostMapping("/aftership")
    public ResponseEntity<Void> handleAfterShip(@RequestBody AfterShipWebhookRequest request) {
        Delivery delivery = deliveryRepository.findByTrackingNumber(request.trackingNumber());
        if (delivery == null) {
            throw new DeliveryException(DeliveryErrorCode.DELIVERY_NOT_FOUND);
        }

        String externalStatus = request.tag();
        DeliveryStatus mapped = DeliveryStatus.mapAfterShipStatus(externalStatus);

        // DeliveryService.trackDelivery 가 DeliveryStatus 매핑 및 이력, 알림을 담당하므로
        // 여기서는 상태 문자열을 기반으로 최소한의 업데이트만 수행합니다.
        if (mapped != null && delivery.getStatus() != mapped) {
            delivery.updateStatus(mapped);
        }

        // 나머지 이력/알림 처리는 폴링 기반 trackDelivery 와 동일하게 동작하도록 유지
        // 필요 시, 별도 Service 메서드로 분리 가능

        return ResponseEntity.ok().build();
    }

    public record AfterShipWebhookRequest(
            String trackingNumber,
            String courierCode,
            String tag
    ) {
    }
}

