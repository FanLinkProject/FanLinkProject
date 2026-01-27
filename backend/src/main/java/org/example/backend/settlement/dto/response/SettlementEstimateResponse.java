package org.example.backend.settlement.dto.response;

import lombok.Builder;
import lombok.Getter;

// 예상 정산 금액용 Dto

@Getter
@Builder
public class SettlementEstimateResponse {

    private Long estimatedAmount; // 예상 정산금
    private String currency;      // "KRW"

    public static SettlementEstimateResponse of(Long amount) {
        return SettlementEstimateResponse.builder()
                .estimatedAmount(amount)
                .currency("KRW")
                .build();
    }
}