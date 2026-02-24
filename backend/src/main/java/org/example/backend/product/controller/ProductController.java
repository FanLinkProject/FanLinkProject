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
     * 상품 목록을 조회합니다.
     * - concertId: 해당 공연의 티켓 상품 (선예매/일반)
     * - artistId: 아티스트 상품 관리용 (artist-console)
     * - artistIds: 그룹+멤버 상품 목록 (쉼표 구분, 팬 마켓 페이지)
     * - 없음: 전체 상품
     */
    @GetMapping
    public ResponseEntity<List<ProductDetailResponse>> getProducts(
            @RequestParam(required = false) Long concertId,
            @RequestParam(required = false) Long artistId,
            @RequestParam(required = false) List<Long> artistIds,
            @RequestParam(required = false) Boolean market) {
        if (concertId != null) {
            return ResponseEntity.ok(productService.getProductsByConcertId(concertId));
        }
        if (artistId != null) {
            return ResponseEntity.ok(productService.getProductsByArtistId(artistId));
        }
        if (artistIds != null && !artistIds.isEmpty()) {
            return ResponseEntity.ok(productService.getProductsByArtistIds(artistIds));
        }
        if (Boolean.TRUE.equals(market)) {
            return ResponseEntity.ok(productService.getMarketProducts());
        }
        return ResponseEntity.ok(productService.getAllProducts());
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

    /**
     * 아티스트/그룹별 상품 목록 (팬 마켓 페이지용).
     * 그룹인 경우 그룹+멤버 상품, 개인 아티스트인 경우 해당 아티스트 상품만 반환.
     */
    @GetMapping("/by-artist/{artistId}")
    public ResponseEntity<List<ProductDetailResponse>> getProductsByArtist(
            @PathVariable Long artistId) {
        return ResponseEntity.ok(productService.getProductsByArtistOrGroupId(artistId));
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
