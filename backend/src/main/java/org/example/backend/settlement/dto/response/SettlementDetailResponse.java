package org.example.backend.settlement.dto.response;

import lombok.Builder;
import lombok.Getter;
import org.example.backend.settlement.entity.SettlementDetail;

import java.math.BigDecimal;

// 정산서 상세 내역 Dto

@Getter
@Builder
public class SettlementDetailResponse {
    private Long id;
    private String orderName;      // 상품명 (스냅샷)
    private String sourceType;     // "일반 상품", "캔디"
    private Long salesAmount;      // 판매 금액
    private BigDecimal shareRatio;     // 적용된 비율 (0.9 or 0.2)
    private Long settlementAmount; // 최종 인정액

    public static SettlementDetailResponse from(SettlementDetail entity) {
        return SettlementDetailResponse.builder()
                .id(entity.getId())
                .orderName(entity.getTitleSnapshot())
                .sourceType(entity.getSourceType().getDescription()) // Enum 설명 활용
                .salesAmount(entity.getSalesAmount())
                .shareRatio(entity.getShareRatio())
                .settlementAmount(entity.getSettlementAmount())
                .build();
    }
}