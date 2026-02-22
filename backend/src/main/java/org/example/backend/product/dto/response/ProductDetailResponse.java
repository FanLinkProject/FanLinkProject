package org.example.backend.product.dto.response;

import lombok.Builder;
import lombok.Getter;
import org.example.backend.product.entity.Product;
import org.example.backend.product.enums.ProductPaymentMethod;
import org.example.backend.product.enums.ProductType;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * 상품 상세 조회 응답
 * 사용: ProductController (GET /api/products/{id}), ProductService.getProductDetail
 */
@Getter
@Builder
public class ProductDetailResponse {
    private Long id;
    private Long artistId;
    private String artistName;
    private Long groupId;   // 그룹 소속 시 그룹 ID (그룹계정 스토어용), 개인 아티스트 시 null
    private String groupName; // 그룹 소속 시 그룹명, 개인 아티스트 시 null
    private String name;
    private Long price;
    private Long candyPrice;
    private ProductType type;
    private ProductPaymentMethod paymentMethod;
    private Boolean isSubscription;
    private Long quantity;
    private Boolean isMembershipOnly;
    private Boolean isExclusive;
    private Boolean isMembership;
    private Long concertId;
    private Long representativeMediaAssetId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ProductMediaAssetResponse> attachments;

    public static ProductDetailResponse from(Product product, List<ProductMediaAssetResponse> attachments) {
        return from(product, attachments, null, null, null);
    }

    public static ProductDetailResponse from(Product product, List<ProductMediaAssetResponse> attachments, String artistName) {
        return from(product, attachments, artistName, null, null);
    }

    public static ProductDetailResponse from(Product product, List<ProductMediaAssetResponse> attachments,
            String artistName, Long groupId, String groupName) {
        return ProductDetailResponse.builder()
                .id(product.getId())
                .artistId(product.getArtistId())
                .artistName(artistName)
                .groupId(groupId)
                .groupName(groupName)
                .name(product.getName())
                .price(product.getPrice())
                .candyPrice(product.getCandyPrice())
                .type(product.getType())
                .paymentMethod(product.getPaymentMethod())
                .isSubscription(product.getIsSubscription())
                .quantity(product.getQuantity())
                .isMembershipOnly(product.getIsMembershipOnly())
                .isExclusive(product.getIsExclusive())
                .isMembership(product.getIsMembership())
                .concertId(product.getConcertId())
                .representativeMediaAssetId(product.getRepresentativeMediaAssetId())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .attachments(attachments != null ? attachments : Collections.emptyList())
                .build();
    }
}
