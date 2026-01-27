package org.example.backend.settlement.batch;

import lombok.Builder;
import lombok.Getter;
import org.example.backend.settlement.entity.Settlement;
import org.example.backend.settlement.entity.SettlementDetail;
import java.util.List;

/**
 * Spring Batch의 Processor에서 Writer로 데이터를 넘기기 위한 내부 데이터 객체
 * (패키지 위치: batch 내부로 이동하여 응집도를 높임)
 */
@Getter
@Builder
public class SettlementBatchData {

    // Writer에서 save할 데이터
    private Settlement settlement;
    private List<SettlementDetail> details;

    // Writer에서 delete할 데이터 ID
    private List<Long> pendingIds;
}