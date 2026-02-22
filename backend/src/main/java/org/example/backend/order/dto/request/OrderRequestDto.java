package org.example.backend.order.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.List;

public record OrderRequestDto(
        @NotBlank(message = "주문명은 필수입니다.")
        String name,
        @NotNull(message = "총 결제 금액은 필수입니다.")
        @PositiveOrZero(message = "총 결제 금액은 0 이상이어야 합니다.")
        Long totalAmount,
        @NotNull(message = "총 캔디 금액은 필수입니다.")
        @PositiveOrZero(message = "총 캔디 금액은 0 이상이어야 합니다.")
        Long totalCandyAmount,
        @NotEmpty(message = "주문 상품은 1개 이상이어야 합니다.")
        List<@Valid OrderItemDto> orderItems,
        // 배송지정보
        @Size(max = 100, message = "수령인 이름은 100자 이하여야 합니다.")
        String recipientName,    // 수령인 이름
        @Size(max = 30, message = "수령인 전화번호는 30자 이하여야 합니다.")
        String recipientPhone,   // 수령인 전화번호
        @Size(max = 255, message = "주소는 255자 이하여야 합니다.")
        String address,          // 주소 (예: 서울시 강남구...)
        @Size(max = 255, message = "상세 주소는 255자 이하여야 합니다.")
        String detailAddress,    // 상세 주소 (예: 101동 101호)
        @Size(max = 20, message = "우편번호는 20자 이하여야 합니다.")
        String zipCode,          // 우편번호
        @Pattern(regexp = "^[A-Z]{2}$", message = "국가 코드는 ISO 2자리 대문자여야 합니다.")
        String countryCode       // ISO 국가코드 (예: KR, US)
) {
}
