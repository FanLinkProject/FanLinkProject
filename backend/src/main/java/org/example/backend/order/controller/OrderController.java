package org.example.backend.order.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.order.dto.request.OrderRequestDto;
import org.example.backend.order.service.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

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
