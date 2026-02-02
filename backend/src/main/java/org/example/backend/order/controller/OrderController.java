package org.example.backend.order.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.order.dto.request.OrderRequestDto;
import org.example.backend.order.service.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    /**
     * 테스트용 PENDING 주문 정보를 반환합니다.
     * 프론트엔드에서 결제 테스트를 위해 임시로 사용됩니다.
     */
    @GetMapping("/test-pending")
    public ResponseEntity<Map<String, Object>> getTestPendingOrder() {
        String orderNo = orderService.getTestPendingOrderNo();
        return ResponseEntity.ok(Map.of(
                "orderNo", orderNo,
                "amount", 24900));
    }

    /**
     * 주문 생성 API
     */
    @PostMapping
    public ResponseEntity<Map<String, String>> createOrder(
            @AuthenticationPrincipal PrincipalDetails principal,
            @RequestBody OrderRequestDto request) {

        String orderNo = orderService.createOrder(principal.getUsername(), request);
        return ResponseEntity.ok(Map.of("orderNo", orderNo));
    }
}
