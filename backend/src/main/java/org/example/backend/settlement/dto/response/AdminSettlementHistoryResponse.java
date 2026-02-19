package org.example.backend.settlement.dto.response;

import lombok.Builder;
import lombok.Getter;
import org.example.backend.settlement.entity.Settlement;
import org.example.backend.settlement.enums.SettlementStatus;

import java.time.Instant;

/**
 * 관리자용 정산 내역 응답 DTO
 * 정산 대상(그룹/아티스트) 정보가 포함된 정산 내역입니다.
 */
@Getter
@Builder
public class AdminSettlementHistoryResponse {

    private Long id;                  // 정산서 ID
    private Long artistId;            // 정산 대상 유저 ID
    private String artistName;        // 정산 대상 이름 (닉네임/예명)
    private String role;              // 역할 ("GROUP" 또는 "ARTIST")
    private String groupName;         // 소속 그룹명
    private String period;            // "2026-01-01 ~ 2026-01-31"
    private Long totalSalesAmount;    // 총 매출
    private Long feeAmount;           // 수수료
    private Long finalAmount;         // 최종 지급액
    private SettlementStatus status;  // 상태 (COMPLETE/CANCELED)
    private Instant settledAt;  // 지급 완료일

    public static AdminSettlementHistoryResponse from(Settlement entity, String artistName,
                                                       String role, String groupName) {
        return AdminSettlementHistoryResponse.builder()
                .id(entity.getId())
                .artistId(entity.getArtistId())
                .artistName(artistName)
                .role(role)
                .groupName(groupName)
                .period(entity.getStartDate() + " ~ " + entity.getEndDate())
                .totalSalesAmount(entity.getTotalSalesAmount())
                .feeAmount(entity.getFeeAmount())
                .finalAmount(entity.getFinalAmount())
                .status(entity.getStatus())
                .settledAt(entity.getSettledAt())
                .build();
    }
}
