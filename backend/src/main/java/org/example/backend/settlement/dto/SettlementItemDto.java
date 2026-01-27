package org.example.backend.settlement.dto;

import lombok.Builder;
import lombok.Getter;
import org.example.backend.settlement.entity.Settlement;
import org.example.backend.settlement.entity.SettlementDetail;
import java.util.List;

// 배치 처리용 Dto SettlementBatchConfig에서 사용됨

@Getter
@Builder
public class SettlementItemDto {
    // 저장할 데이터
    private Settlement settlement;
    private List<SettlementDetail> details;

    // 삭제할 데이터 ID
    private List<Long> pendingIds;
}