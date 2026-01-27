package org.example.backend.settlement.batch;

import lombok.Builder;
import lombok.Getter;
import org.example.backend.settlement.entity.Settlement;
import org.example.backend.settlement.entity.SettlementDetail;
import java.util.List;

/**
 * Spring Batch 데이터 전달 객체 (Processor -> Writer)
 * 1. ItemProcessor:
 * - 정산 로직을 수행하여 `Settlement`(정산서)와 `SettlementDetail`(상세) 엔티티를 생성
 * - 정산 처리가 완료된 `SettlementPending`의 ID 목록(`pendingIds`)을 추출
 * - 위 데이터들을 이 객체(`SettlementBatchData`)에 담아 반환
 *
 * 2. ItemWriter:
 * - 이 객체를 전달받아 `settlement`와 `details`는 DB에 저장(INSERT)
 * - `pendingIds`에 해당하는 대기열 데이터는 DB에서 삭제(DELETE)
 */
@Getter
@Builder
public class SettlementBatchData {

    // Writer에서 저장할 정산서 엔티티 (INSERT 대상)
    private Settlement settlement;

    // Writer에서 저장할 상세 내역 리스트 (INSERT 대상)
    private List<SettlementDetail> details;

    // Writer에서 삭제할 대기열 ID 리스트 (DELETE 대상 - 정산 처리 완료)
    private List<Long> pendingIds;
}