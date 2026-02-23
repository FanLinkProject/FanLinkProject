package org.example.backend.order.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.order.dto.request.CandyOrderRequestDto;
import org.example.backend.order.dto.request.OrderRequestDto;
import org.example.backend.order.dto.response.ArtistOrderDeliveryResponseDto;
import org.example.backend.order.service.OrderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    public ResponseEntity<Map<String, String>> createOrder(
            @AuthenticationPrincipal PrincipalDetails principal,
            @Valid @RequestBody OrderRequestDto request) {

        String orderNo = orderService.createOrder(principal.getUsername(), request);
        return ResponseEntity.ok(Map.of("orderNo", orderNo));
    }

    @PostMapping("/candy")
    public ResponseEntity<Map<String, String>> createCandyOrder(
            @AuthenticationPrincipal PrincipalDetails principal,
            @Valid @RequestBody CandyOrderRequestDto request) {

        String orderNo = orderService.createCandyOrder(principal.getUsername(), request);
        return ResponseEntity.ok(Map.of("orderNo", orderNo));
    }

    @GetMapping("/artist-console")
    @PreAuthorize("hasAnyRole('ADMIN','ARTIST','GROUP')")
    public ResponseEntity<List<ArtistOrderDeliveryResponseDto>> getArtistConsoleOrders(
            @AuthenticationPrincipal PrincipalDetails principal
    ) {
        if (principal == null || principal.getUser() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        List<ArtistOrderDeliveryResponseDto> response =
                orderService.getArtistConsoleOrders(principal.getUserId(), principal.getUser().getRole());
        return ResponseEntity.ok(response);
    }
}
