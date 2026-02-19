package org.example.backend.settlement.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.ZoneId;

/**
 * 관리자 수동 정산 실행 요청 DTO
 * startDate, endDate를 지정하지 않으면 전월 1일 ~ 전월 말일로 자동 설정됩니다.
 */
@Getter
@NoArgsConstructor
public class ManualSettlementRequest {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private LocalDate startDate;
    private LocalDate endDate;

    /**
     * 시작일이 없으면 전월 1일 반환
     */
    public LocalDate getResolvedStartDate() {
        if (startDate != null) return startDate;
        LocalDate lastMonth = LocalDate.now(KST).minusMonths(1);
        return lastMonth.withDayOfMonth(1);
    }

    /**
     * 종료일이 없으면 전월 말일 반환
     */
    public LocalDate getResolvedEndDate() {
        if (endDate != null) return endDate;
        LocalDate lastMonth = LocalDate.now(KST).minusMonths(1);
        return lastMonth.withDayOfMonth(lastMonth.lengthOfMonth());
    }
}

