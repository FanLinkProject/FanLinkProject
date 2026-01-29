package org.example.backend.settlement.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.settlement.dto.response.SettlementDetailResponse;
import org.example.backend.settlement.dto.response.SettlementEstimateResponse;
import org.example.backend.settlement.dto.response.SettlementHistoryResponse;
import org.example.backend.settlement.entity.Settlement;
import org.example.backend.settlement.enums.SettlementSourceType;
import org.example.backend.settlement.exception.SettlementErrorCode;
import org.example.backend.settlement.exception.SettlementException;
import org.example.backend.settlement.repository.SettlementDetailRepository;
import org.example.backend.settlement.repository.SettlementPendingRepository;
import org.example.backend.settlement.repository.SettlementRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SettlementDashboardService {

    private final SettlementPendingRepository pendingRepository;
    private final SettlementRepository settlementRepository;
    private final SettlementDetailRepository detailRepository;

    /**
     * 1. [실시간] 이번 달 정산 예상 금액 조회
     * - 소스 타입별(상품 90%, 캔디 20%) 비율을 적용하여 합산
     */
    public SettlementEstimateResponse getEstimatedAmount(Long artistId) {
        // 1. 소스 타입별 매출 합계 조회 (GROUP BY)
        // totalSales는 '매출 총액(KRW)'이어야 함
        List<Object[]> results = pendingRepository.findTotalAmountGroupBySourceType(artistId);

        long totalEstimatedAmount = 0;

        // 2. 자바 메모리 상에서 비율 계산 수행
        for (Object[] row : results) {
            SettlementSourceType type = (SettlementSourceType) row[0];
            Long totalSales = (Long) row[1];

            // 캔디(CANDY) 처리 주의사항
            // DB의 amount(totalSales)는 '캔디 개수'가 아닌 '(개수 * 단가)'로 환산된 '금액(KRW)'이어야 함
            // 예: 캔디 100개(개당 100원) 사용 -> DB amount: 10,000원 -> 정산금: 10,000 * 0.2 = 2,000원
            long settlementAmount = BigDecimal.valueOf(totalSales)
                    .multiply(type.getDefaultShareRatio())
                    .setScale(0, RoundingMode.FLOOR)
                    .longValue();

            totalEstimatedAmount += settlementAmount;
        }

        return SettlementEstimateResponse.of(totalEstimatedAmount);
    }

    /**
     * 2. [히스토리] 과거 지급 완료된 정산 목록 조회
     */
    public List<SettlementHistoryResponse> getSettlementHistory(Long artistId) {
        return settlementRepository.findAllByArtistIdOrderBySettledAtDesc(artistId)
                .stream()
                .map(SettlementHistoryResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 3. [상세] 특정 정산서의 상세 내역 조회
     */
    public List<SettlementDetailResponse> getSettlementDetails(Long artistId, Long settlementId) {
        Settlement settlement = settlementRepository.findById(settlementId)
                .orElseThrow(() -> new SettlementException(SettlementErrorCode.SETTLEMENT_NOT_FOUND));

        // 보안 검증
        if (!settlement.getArtistId().equals(artistId)) {
            throw new SettlementException(SettlementErrorCode.SETTLEMENT_ACCESS_DENIED);
        }

        return detailRepository.findAllBySettlementId(settlementId)
                .stream()
                .map(SettlementDetailResponse::from)
                .collect(Collectors.toList());
    }
}