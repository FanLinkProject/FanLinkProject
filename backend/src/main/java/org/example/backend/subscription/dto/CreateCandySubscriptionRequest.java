package org.example.backend.subscription.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 캔디 구독 생성 요청 DTO
 * 캔디 구독은 별도의 인증 키 없이 상품 ID만 필요합니다.
 */
@Getter
@NoArgsConstructor
public class CreateCandySubscriptionRequest {
    private Long productId;
}
