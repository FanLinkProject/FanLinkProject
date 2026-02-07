package org.example.backend.settlement.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 관리자 수동 정산 실행 결과 응답 DTO
 */
@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ManualSettlementResponse {

    private String status;           // SUCCESS, ALREADY_RUNNING, FAILED
    private String message;          // 결과 메시지
    private LocalDate startDate;     // 정산 시작일
    private LocalDate endDate;       // 정산 종료일
    private LocalDateTime executedAt; // 실행 시각

    public static ManualSettlementResponse success(LocalDate startDate, LocalDate endDate) {
        return ManualSettlementResponse.builder()
                .status("SUCCESS")
                .message(startDate + " ~ " + endDate + " 기간의 정산 배치가 실행되었습니다.")
                .startDate(startDate)
                .endDate(endDate)
                .executedAt(LocalDateTime.now())
                .build();
    }

    public static ManualSettlementResponse alreadyRunning() {
        return ManualSettlementResponse.builder()
                .status("ALREADY_RUNNING")
                .message("정산 배치가 이미 실행 중입니다. 완료 후 다시 시도해 주세요.")
                .executedAt(LocalDateTime.now())
                .build();
    }

    public static ManualSettlementResponse failed(String errorMessage) {
        return ManualSettlementResponse.builder()
                .status("FAILED")
                .message("정산 배치 실행 중 오류가 발생했습니다: " + errorMessage)
                .executedAt(LocalDateTime.now())
                .build();
    }
}

