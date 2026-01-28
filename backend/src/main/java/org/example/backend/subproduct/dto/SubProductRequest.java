package org.example.backend.subproduct.dto;

/**
 * 구독 상품 생성/수정 요청
 * 사용: SubProductController (POST /api/sub-products, PUT
 * /api/sub-products/{id}), SubProductService.create, update
 */
public record SubProductRequest(
                String name,
                Long price,
                Integer durationDays,
                Long candyAmount) {
}
