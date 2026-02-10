package org.example.backend.product.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.example.backend.product.enums.ProductPaymentMethod;
import org.example.backend.product.enums.ProductType;

public record ProductRequestDto(
                Long artistId, // 플랫폼 상품일 경우 null

                @NotBlank(message = "상품명은 필수입니다.") String name,

                @NotNull(message = "가격은 필수입니다.") Long price,

                Long candyPrice,

                @NotNull(message = "상품 타입은 필수입니다.") ProductType type,

                @NotNull(message = "결제 방식은 필수입니다.") ProductPaymentMethod paymentMethod,

                Boolean isSubscription,

                Long quantity,
                Boolean isMembershipOnly,
                Boolean isExclusive,
                Boolean isMembership) {
}
