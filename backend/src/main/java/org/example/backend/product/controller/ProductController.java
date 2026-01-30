package org.example.backend.product.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.product.entity.Product;
import org.example.backend.product.service.ProductService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    /**
     * 모든 상품 목록을 조회합니다.
     * 프론트엔드에서 구독 여부(isSubscription)로 필터링하여 보여줄 수 있습니다.
     */
    @GetMapping
    public ResponseEntity<List<Product>> getAllProducts() {
        List<Product> products = productService.getAllProducts();
        return ResponseEntity.ok(products);
    }
}
