package org.example.backend.settlement.dto.response;

import lombok.Builder;
import lombok.Getter;

/**
 * 관리자용 정산 실패 로그 요약 응답 DTO
 * 전체 실패 건수, 미처리 건수, 복구 완료 건수를 한눈에 파악할 수 있습니다.
 */
@Getter
@Builder
public class AdminFailureLogSummaryResponse {

    private long totalCount;          // 전체 실패 로그 수
    private long unprocessedCount;    // 미처리(복구 대기) 건수
    private long processedCount;      // 복구 완료 건수

    public static AdminFailureLogSummaryResponse of(long total, long unprocessed) {
        return AdminFailureLogSummaryResponse.builder()
                .totalCount(total)
                .unprocessedCount(unprocessed)
                .processedCount(total - unprocessed)
                .build();
    }
}

