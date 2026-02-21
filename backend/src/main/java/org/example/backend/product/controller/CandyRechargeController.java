package org.example.backend.product.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.product.dto.response.ProductDetailResponse;
import org.example.backend.product.service.ProductService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 캔디 충전 상품 API.
 * /api/products/candy-recharge와의 경로 충돌을 피하기 위해 별도 컨트롤러로 분리.
 */
@RestController
@RequestMapping("/api/candy-recharge")
@RequiredArgsConstructor
public class CandyRechargeController {

    private final ProductService productService;

    @GetMapping("/products")
    public ResponseEntity<List<ProductDetailResponse>> getProducts() {
        return ResponseEntity.ok(productService.getCandyRechargeProducts());
    }
}
