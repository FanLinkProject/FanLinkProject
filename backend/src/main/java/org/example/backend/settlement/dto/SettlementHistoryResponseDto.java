package org.example.backend.settlement.dto;

import lombok.Builder;
import lombok.Getter;
import org.example.backend.settlement.entity.Settlement;
import org.example.backend.settlement.enums.SettlementStatus;

import java.time.LocalDateTime;


// 정산 내역 응답 Dto : SettlementController에서 아티스트에게 과거 내역 보여줄 때 사용

@Getter
@Builder
public class SettlementHistoryResponseDto {
    private Long id;                // 정산서 ID
    private String period;          // "2026-01-01 ~ 2026-01-31"
    private Long totalSalesAmount;  // 총 매출
    private Long feeAmount;         // 수수료
    private Long finalAmount;       // 최종 지급액
    private SettlementStatus status;// 상태 (COMPLETE)
    private LocalDateTime settledAt;// 지급 완료일

    public static SettlementHistoryResponseDto from(Settlement entity) {
        return SettlementHistoryResponseDto.builder()
                .id(entity.getId())
                .period(entity.getStartDate() + " ~ " + entity.getEndDate())
                .totalSalesAmount(entity.getTotalSalesAmount())
                .feeAmount(entity.getFeeAmount())
                .finalAmount(entity.getFinalAmount())
                .status(entity.getStatus())
                .settledAt(entity.getSettledAt())
                .build();
    }
}