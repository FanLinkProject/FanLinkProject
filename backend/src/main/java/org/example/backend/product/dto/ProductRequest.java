package org.example.backend.product.dto;

/**
 * 상품 생성/수정 요청
 * 사용: ProductController (POST /api/products, PUT /api/products/{id}), ProductService.create, update
 */
public record ProductRequest(
        String name,
        Long price,
        Integer stock,
        Long artistId
) {
}
