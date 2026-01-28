package org.example.backend.order.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.order.service.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @GetMapping("/test-pending")
    public ResponseEntity<Map<String, Object>> getTestPendingOrder() {
        String orderNo = orderService.getTestPendingOrderNo();
        return ResponseEntity.ok(Map.of(
                "orderNo", orderNo,
                "amount", 24900));
    }
}
