package org.example.backend.subscription.dto;

import lombok.Builder;
import lombok.Getter;
import org.example.backend.subscription.entity.Subscription;

import java.time.Instant;

/**
 * 구독 정보 응답 DTO
 * 프론트엔드에 구독 상태와 다음 결제일 등을 전달합니다.
 */
@Getter
@Builder
public class SubscriptionResponse {
    private Long id;
    private String productName;
    private String subscriptionType;
    private Instant startDate;
    private Instant nextPaymentDate;
    private Boolean isActive;

    public static SubscriptionResponse fromEntity(Subscription subscription) {
        return SubscriptionResponse.builder()
                .id(subscription.getId())
                .productName(subscription.getProduct().getName())
                .subscriptionType(subscription.getBillingKey() != null ? "CASH" : "CANDY")
                .startDate(subscription.getStartDate())
                .nextPaymentDate(subscription.getNextPaymentDate())
                .isActive(subscription.getIsActive())
                .build();
    }
}
