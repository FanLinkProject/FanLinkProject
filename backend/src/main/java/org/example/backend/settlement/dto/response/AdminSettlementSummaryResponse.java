package org.example.backend.settlement.dto.response;

import lombok.Builder;
import lombok.Getter;

/**
 * 관리자용 정산 대상별 정산 요약 응답 DTO
 * 각 정산 대상(그룹 공용 계정 / 개별 아티스트)의 총 정산 현황을 한눈에 볼 수 있습니다.
 */
@Getter
@Builder
public class AdminSettlementSummaryResponse {

    private Long artistId;            // 정산 대상 유저 ID
    private String artistName;        // 정산 대상 이름 (닉네임/예명)
    private String role;              // 역할 ("GROUP" 또는 "ARTIST")
    private String groupName;         // 소속 그룹명 (GROUP이면 자신의 그룹명, ARTIST이면 소속 그룹명, 없으면 null)
    private Long totalSettlementCount;// 총 정산 횟수
    private Long totalSalesAmount;    // 누적 총 매출
    private Long totalFeeAmount;      // 누적 수수료
    private Long totalFinalAmount;    // 누적 실 지급액
    private Long pendingEstimate;     // 이번 달 정산 예상 금액
}
