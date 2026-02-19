package org.example.backend.product.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.product.dto.response.ProductDetailResponse;
import org.example.backend.product.service.ProductService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import org.example.backend.product.dto.request.ProductRequestDto;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    /**
     * 모든 상품 목록을 조회합니다.
     * 프론트엔드에서 구독 여부(isSubscription)로 필터링하여 보여줄 수 있습니다.
     */
    @GetMapping
    public ResponseEntity<List<ProductDetailResponse>> getAllProducts() {
        List<ProductDetailResponse> products = productService.getAllProducts();
        return ResponseEntity.ok(products);
    }

    @PostMapping
    public ResponseEntity<ProductDetailResponse> createProduct(@RequestBody ProductRequestDto request) {
        ProductDetailResponse product = productService.createProduct(request);
        return ResponseEntity.ok(product);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDetailResponse> getProduct(@PathVariable Long id) {
        ProductDetailResponse product = productService.getProductDetail(id);
        return ResponseEntity.ok(product);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductDetailResponse> updateProduct(@PathVariable Long id, @RequestBody ProductRequestDto request) {
        ProductDetailResponse product = productService.updateProduct(id, request);
        return ResponseEntity.ok(product);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }
}
