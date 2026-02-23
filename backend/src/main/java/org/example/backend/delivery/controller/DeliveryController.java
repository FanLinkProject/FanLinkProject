package org.example.backend.delivery.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.delivery.dto.DeliveryResponseDto;
import org.example.backend.delivery.service.DeliveryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/deliveries")
public class DeliveryController {

    private final DeliveryService deliveryService;

    /**
     * 배송 조회 API
     * GET /api/deliveries/{deliveryId}
     */
    @GetMapping("/{deliveryId}")
    public ResponseEntity<DeliveryResponseDto> getDeliveryInfo(@PathVariable Long deliveryId) {
        DeliveryResponseDto response = deliveryService.trackDelivery(deliveryId);
        return ResponseEntity.ok(response);
    }

    /**
     * [관리자용] 운송장 번호 등록 및 배송 시작 API
     * POST /api/deliveries/{deliveryId}/start?courier=cj&number=1234
     */
    @PostMapping("/{deliveryId}/start")
    public ResponseEntity<DeliveryResponseDto> startShipping(
            @PathVariable Long deliveryId,
            @RequestParam String courier,  // 예: cj, post
            @RequestParam String number    // 예: 123456789
    ) {
        DeliveryResponseDto response = deliveryService.startShipping(deliveryId, courier, number);
        return ResponseEntity.ok(response);
    }
}