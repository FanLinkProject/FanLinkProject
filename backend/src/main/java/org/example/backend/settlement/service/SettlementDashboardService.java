package org.example.backend.settlement.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.settlement.dto.response.*;
import org.example.backend.settlement.entity.Settlement;
import org.example.backend.settlement.enums.SettlementSourceType;
import org.example.backend.settlement.exception.SettlementErrorCode;
import org.example.backend.settlement.exception.SettlementException;
import org.example.backend.settlement.repository.SettlementDetailRepository;
import org.example.backend.settlement.repository.SettlementFailureLogRepository;
import org.example.backend.settlement.repository.SettlementPendingRepository;
import org.example.backend.settlement.repository.SettlementRepository;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.repository.GroupMemberRepository;
import org.example.backend.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SettlementDashboardService {

    private final SettlementPendingRepository pendingRepository;
    private final SettlementRepository settlementRepository;
    private final SettlementDetailRepository detailRepository;
    private final SettlementFailureLogRepository failureLogRepository;
    private final UserRepository userRepository;
    private final GroupMemberRepository groupMemberRepository;

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

    // ===== [관리자 전용 메서드] =====

    /**
     * [관리자] 정산 대상별 정산 요약 목록 조회
     * 정산 이력이 있는 모든 정산 대상(GROUP/ARTIST)의 누적 정산 현황 + 이번 달 예상 정산금을 반환합니다.
     */
    public List<AdminSettlementSummaryResponse> getAdminSettlementSummaries() {
        // 1. 정산 이력이 있는 유저 ID 목록 조회
        List<Long> targetIds = settlementRepository.findDistinctArtistIds();

        if (targetIds.isEmpty()) {
            return List.of();
        }

        // 2. 유저 정보 일괄 조회 (N+1 방지)
        Map<Long, User> userMap = userRepository.findAllById(targetIds)
                .stream()
                .collect(Collectors.toMap(User::getId, user -> user));

        // 3. 그룹명 일괄 조회 (N+1 방지)
        // GROUP 역할 유저 → 자신의 그룹명 조회
        // ARTIST 역할 유저 → 소속 그룹명 조회
        Map<Long, String> groupNameMap = buildGroupNameMap(targetIds, userMap);

        // 4. 정산 대상별 요약 데이터 생성
        List<AdminSettlementSummaryResponse> summaries = new ArrayList<>();

        for (Long targetId : targetIds) {
            Object[] summary = settlementRepository.findSettlementSummaryByArtistId(targetId);

            // JPA 쿼리가 이중 배열 [[value1, value2, value3, value4]]을 반환하므로
            // summary[0]를 먼저 추출하여 실제 데이터 배열을 얻음
            Object[] data = (Object[]) summary[0];

            // JPA의 SUM() 함수는 Long이 아닌 Number 타입을 반환할 수 있으므로 안전하게 변환
            Long totalSales = ((Number) data[0]).longValue();
            Long totalFee = ((Number) data[1]).longValue();
            Long totalFinal = ((Number) data[2]).longValue();
            Long count = ((Number) data[3]).longValue();

            // 이번 달 예상 정산금 계산
            long pendingEstimate = calculatePendingEstimate(targetId);

            User user = userMap.get(targetId);
            String roleName = user != null ? user.getRole().name() : "UNKNOWN";
            String nickname = user != null ? user.getNickname() : "알 수 없음";

            summaries.add(AdminSettlementSummaryResponse.builder()
                    .artistId(targetId)
                    .artistName(nickname)
                    .role(roleName)
                    .groupName(groupNameMap.get(targetId))
                    .totalSettlementCount(count)
                    .totalSalesAmount(totalSales)
                    .totalFeeAmount(totalFee)
                    .totalFinalAmount(totalFinal)
                    .pendingEstimate(pendingEstimate)
                    .build());
        }

        return summaries;
    }

    /**
     * [관리자] 전체 정산 내역 조회 (페이징)
     * 모든 정산 대상(GROUP/ARTIST)의 정산 내역을 최신순으로 반환합니다.
     */
    public Page<AdminSettlementHistoryResponse> getAdminAllSettlements(Pageable pageable) {
        Page<Settlement> settlements = settlementRepository.findAllByOrderBySettledAtDesc(pageable);

        // 유저 정보 일괄 조회 (N+1 방지)
        List<Long> targetIds = settlements.getContent().stream()
                .map(Settlement::getArtistId)
                .distinct()
                .collect(Collectors.toList());

        Map<Long, User> userMap = userRepository.findAllById(targetIds)
                .stream()
                .collect(Collectors.toMap(User::getId, user -> user));

        // 그룹명 일괄 조회
        Map<Long, String> groupNameMap = buildGroupNameMap(targetIds, userMap);

        return settlements.map(settlement -> {
            Long targetId = settlement.getArtistId();
            User user = userMap.get(targetId);
            String nickname = user != null ? user.getNickname() : "알 수 없음";
            String roleName = user != null ? user.getRole().name() : "UNKNOWN";

            return AdminSettlementHistoryResponse.from(
                    settlement, nickname, roleName, groupNameMap.get(targetId)
            );
        });
    }

    /**
     * [관리자] 특정 정산 대상의 정산 내역 조회 (페이징)
     */
    public Page<AdminSettlementHistoryResponse> getAdminArtistSettlements(Long artistId, Pageable pageable) {
        User target = userRepository.findById(artistId)
                .orElseThrow(() -> new SettlementException(SettlementErrorCode.SETTLEMENT_ARTIST_NOT_FOUND));

        Page<Settlement> settlements = settlementRepository
                .findAllByArtistIdOrderBySettledAtDesc(artistId, pageable);

        String roleName = target.getRole().name();
        String groupName = resolveGroupName(target);

        return settlements.map(settlement ->
                AdminSettlementHistoryResponse.from(settlement, target.getNickname(), roleName, groupName)
        );
    }

    /**
     * [관리자] 특정 정산 대상의 정산 예상 금액 조회
     */
    public SettlementEstimateResponse getAdminArtistEstimate(Long artistId) {
        if (!userRepository.existsById(artistId)) {
            throw new SettlementException(SettlementErrorCode.SETTLEMENT_ARTIST_NOT_FOUND);
        }

        return getEstimatedAmount(artistId);
    }

    /**
     * [관리자] 특정 정산서의 상세 내역 조회 (권한 검증 없이)
     */
    public List<SettlementDetailResponse> getAdminSettlementDetails(Long settlementId) {
        settlementRepository.findById(settlementId)
                .orElseThrow(() -> new SettlementException(SettlementErrorCode.SETTLEMENT_NOT_FOUND));

        return detailRepository.findAllBySettlementId(settlementId)
                .stream()
                .map(SettlementDetailResponse::from)
                .collect(Collectors.toList());
    }

    // ===== [관리자 전용 — 실패 로그 조회] =====

    /**
     * [관리자] 실패 로그 요약 조회
     * 전체 건수, 미처리 건수, 복구 완료 건수를 반환합니다.
     */
    public AdminFailureLogSummaryResponse getAdminFailureLogSummary() {
        long totalCount = failureLogRepository.count();
        long unprocessedCount = failureLogRepository.countByIsProcessed(false);

        return AdminFailureLogSummaryResponse.of(totalCount, unprocessedCount);
    }

    /**
     * [관리자] 실패 로그 목록 조회 (페이징)
     * @param isProcessed null: 전체, true: 복구 완료, false: 미처리
     */
    public Page<AdminFailureLogResponse> getAdminFailureLogs(Boolean isProcessed, Pageable pageable) {
        if (isProcessed != null) {
            return failureLogRepository.findByIsProcessedOrderByCreatedAtDesc(isProcessed, pageable)
                    .map(AdminFailureLogResponse::from);
        }
        return failureLogRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(AdminFailureLogResponse::from);
    }

    // ===== [내부 공용 메서드] =====

    /**
     * 이번 달 정산 예상 금액을 계산합니다.
     */
    private long calculatePendingEstimate(Long artistId) {
        List<Object[]> results = pendingRepository.findTotalAmountGroupBySourceType(artistId);
        long totalEstimatedAmount = 0;

        for (Object[] row : results) {
            SettlementSourceType type = (SettlementSourceType) row[0];
            Long totalSales = (Long) row[1];

            long settlementAmount = BigDecimal.valueOf(totalSales)
                    .multiply(type.getDefaultShareRatio())
                    .setScale(0, RoundingMode.FLOOR)
                    .longValue();

            totalEstimatedAmount += settlementAmount;
        }

        return totalEstimatedAmount;
    }

    /**
     * 여러 유저의 그룹명을 일괄 조회하여 Map으로 반환합니다.
     * - GROUP 역할 유저 → 자신이 관리하는 그룹의 그룹명
     * - ARTIST 역할 유저 → 소속 그룹의 그룹명 (소속이 없으면 null)
     */
    private Map<Long, String> buildGroupNameMap(List<Long> userIds, Map<Long, User> userMap) {
        Map<Long, String> groupNameMap = new HashMap<>();

        // GROUP 역할 유저 ID 분리
        List<Long> groupUserIds = userIds.stream()
                .filter(id -> userMap.containsKey(id) && userMap.get(id).getRole() == UserRole.GROUP)
                .collect(Collectors.toList());

        // ARTIST 역할 유저 ID 분리
        List<Long> artistUserIds = userIds.stream()
                .filter(id -> userMap.containsKey(id) && userMap.get(id).getRole() == UserRole.ARTIST)
                .collect(Collectors.toList());

        // GROUP 유저의 그룹명 일괄 조회
        if (!groupUserIds.isEmpty()) {
            groupMemberRepository.findGroupNamesByGroupIds(groupUserIds)
                    .forEach(row -> groupNameMap.put((Long) row[0], (String) row[1]));
        }

        // ARTIST 유저의 소속 그룹명 일괄 조회
        if (!artistUserIds.isEmpty()) {
            groupMemberRepository.findGroupNamesByMemberIds(artistUserIds)
                    .forEach(row -> groupNameMap.put((Long) row[0], (String) row[1]));
        }

        return groupNameMap;
    }

    /**
     * 단일 유저의 그룹명을 조회합니다.
     */
    private String resolveGroupName(User user) {
        if (user.getRole() == UserRole.GROUP) {
            return groupMemberRepository.findGroupNameByGroupId(user.getId()).orElse(null);
        } else if (user.getRole() == UserRole.ARTIST) {
            return groupMemberRepository.findGroupNameByMemberId(user.getId()).orElse(null);
        }
        return null;
    }
}