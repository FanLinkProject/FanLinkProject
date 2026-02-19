package org.example.backend.product.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.user.enums.UserRole;
import org.example.backend.product.dto.request.ProductRequestDto;
import org.example.backend.product.dto.response.ProductDetailResponse;
import org.example.backend.product.service.ProductService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    public ResponseEntity<ProductDetailResponse> createProduct(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @RequestBody ProductRequestDto request) {
        Long userId = principalDetails != null ? principalDetails.getUserId() : null;
        UserRole role = principalDetails != null ? principalDetails.getUser().getRole() : null;
        ProductDetailResponse product = productService.createProduct(userId, role, request);
        return ResponseEntity.ok(product);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDetailResponse> getProduct(@PathVariable Long id) {
        ProductDetailResponse product = productService.getProductDetail(id);
        return ResponseEntity.ok(product);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductDetailResponse> updateProduct(
            @PathVariable Long id,
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @RequestBody ProductRequestDto request) {
        Long userId = principalDetails != null ? principalDetails.getUserId() : null;
        UserRole role = principalDetails != null ? principalDetails.getUser().getRole() : null;
        ProductDetailResponse product = productService.updateProduct(id, userId, role, request);
        return ResponseEntity.ok(product);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(
            @PathVariable Long id,
            @AuthenticationPrincipal PrincipalDetails principalDetails) {
        Long userId = principalDetails != null ? principalDetails.getUserId() : null;
        UserRole role = principalDetails != null ? principalDetails.getUser().getRole() : null;
        productService.deleteProduct(id, userId, role);
        return ResponseEntity.noContent().build();
    }
}
