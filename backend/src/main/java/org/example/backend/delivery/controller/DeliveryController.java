package org.example.backend.delivery.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.delivery.dto.DeliveryResponseDto;
import org.example.backend.delivery.dto.DeliveryStatusHistoryResponseDto;
import org.example.backend.delivery.exception.DeliveryErrorCode;
import org.example.backend.delivery.exception.DeliveryException;
import org.example.backend.delivery.service.DeliveryService;
import org.example.backend.global.security.details.PrincipalDetails;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    public ResponseEntity<DeliveryResponseDto> getDeliveryInfo(
            @PathVariable Long deliveryId,
            @AuthenticationPrincipal PrincipalDetails principalDetails
    ) {
        if (principalDetails == null) {
            throw new DeliveryException(DeliveryErrorCode.DELIVERY_ACCESS_DENIED);
        }
        DeliveryResponseDto response = deliveryService.trackDeliveryForUser(deliveryId, principalDetails.getUserId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{deliveryId}/history")
    public ResponseEntity<List<DeliveryStatusHistoryResponseDto>> getDeliveryHistory(
            @PathVariable Long deliveryId,
            @AuthenticationPrincipal PrincipalDetails principalDetails
    ) {
        if (principalDetails == null) {
            throw new DeliveryException(DeliveryErrorCode.DELIVERY_ACCESS_DENIED);
        }
        List<DeliveryStatusHistoryResponseDto> response =
                deliveryService.getStatusHistoryForUser(deliveryId, principalDetails.getUserId());
        return ResponseEntity.ok(response);
    }

    /**
     * [관리자용] 운송장 번호 등록 및 배송 시작 API
     * POST /api/deliveries/{deliveryId}/start?courier=cj&number=1234
     */
    @PostMapping("/{deliveryId}/start")
    @PreAuthorize("hasAnyRole('ADMIN','ARTIST','GROUP')")
    public ResponseEntity<DeliveryResponseDto> startShipping(
             @PathVariable Long deliveryId,
             @RequestParam String courier,  // 예: cj, post
            @RequestParam String number    // 예: 123456789
    ) {
        DeliveryResponseDto response = deliveryService.startShipping(deliveryId, courier, number);
        return ResponseEntity.ok(response);
    }
}
