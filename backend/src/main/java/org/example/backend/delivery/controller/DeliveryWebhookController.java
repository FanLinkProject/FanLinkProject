package org.example.backend.delivery.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.example.backend.delivery.exception.DeliveryErrorCode;
import org.example.backend.delivery.exception.DeliveryException;
import org.example.backend.delivery.security.AfterShipWebhookSignatureVerifier;
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

    private final DeliveryService deliveryService;
    private final AfterShipWebhookSignatureVerifier signatureVerifier;
    private final ObjectMapper objectMapper;

    /**
     * AfterShip 스타일의 webhook 예시:
     *  - trackingNumber: 운송장 번호
     *  - courierCode: 택배사 코드
     *  - tag: AfterShip tag (Pending, InTransit, Delivered, Exception 등)
     */
    @PostMapping("/aftership")
    public ResponseEntity<Void> handleAfterShip(
            HttpServletRequest servletRequest,
            @RequestBody String rawBody
    ) {
        String signature = servletRequest.getHeader(signatureVerifier.signatureHeader());
        if (!signatureVerifier.verify(rawBody, signature)) {
            throw new DeliveryException(DeliveryErrorCode.INVALID_WEBHOOK_SIGNATURE);
        }

        AfterShipWebhookRequest request = parseRequest(rawBody);
        deliveryService.handleAfterShipWebhook(request.trackingNumber(), request.courierCode(), request.tag());

        return ResponseEntity.ok().build();
    }

    private AfterShipWebhookRequest parseRequest(String rawBody) {
        try {
            return objectMapper.readValue(rawBody, AfterShipWebhookRequest.class);
        } catch (Exception e) {
            throw new DeliveryException(DeliveryErrorCode.INVALID_WEBHOOK_PAYLOAD);
        }
    }

    public record AfterShipWebhookRequest(
            String trackingNumber,
            String courierCode,
            String tag
    ) {
    }
}
