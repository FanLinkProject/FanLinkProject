package org.example.backend.subscription.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 현금 구독 생성 요청 DTO
 * Toss Payments 빌링키 발급을 위한 authKey, customerKey가 필요합니다.
 */
@Getter
@NoArgsConstructor
public class CreateCashSubscriptionRequest {
    private Long productId;
    private String authKey;
    private String customerKey;
}
