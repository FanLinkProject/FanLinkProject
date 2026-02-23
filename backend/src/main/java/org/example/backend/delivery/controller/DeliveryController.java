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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/deliveries")
public class DeliveryController {

    private final DeliveryService deliveryService;

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

    @PostMapping("/{deliveryId}/start")
    @PreAuthorize("hasAnyRole('ADMIN','ARTIST','GROUP')")
    public ResponseEntity<DeliveryResponseDto> startShipping(
            @PathVariable Long deliveryId,
            @RequestParam String courier,
            @RequestParam String number,
            @AuthenticationPrincipal PrincipalDetails principalDetails
    ) {
        if (principalDetails == null) {
            throw new DeliveryException(DeliveryErrorCode.DELIVERY_ACCESS_DENIED);
        }
        DeliveryResponseDto response = deliveryService.startShipping(
                deliveryId,
                courier,
                number,
                principalDetails.getUserId(),
                principalDetails.getUser().getRole()
        );
        return ResponseEntity.ok(response);
    }
}
