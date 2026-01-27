package org.example.backend.settlement.dto;

import lombok.Builder;
import lombok.Getter;

// 예상 정산 금액용 Dto

@Getter
@Builder
public class SettlementEstimateResponseDto {

    private Long estimatedAmount; // 예상 정산금
    private String currency;      // "KRW"

    public static SettlementEstimateResponseDto of(Long amount) {
        return SettlementEstimateResponseDto.builder()
                .estimatedAmount(amount)
                .currency("KRW")
                .build();
    }
}