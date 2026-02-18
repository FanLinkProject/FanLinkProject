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
        // totalSales는 '매출 총액(KRW)'
        List<Object[]> results = pendingRepository.findTotalAmountGroupBySourceType(artistId);

        long totalEstimatedAmount = 0;

        // 2. 자바 메모리 상에서 비율 계산 수행
        for (Object[] row : results) {
            SettlementSourceType type = (SettlementSourceType) row[0];
            Long totalSales = (Long) row[1];

            // 정산 타입별 비율 적용: CASH(90%), CANDY(20%)
            // totalSales는 이미 KRW 환산된 금액 (캔디는 EventListener에서 환율 적용됨)
            // 예: 현금 10,000원 -> 9,000원 / 캔디 10,000원 -> 2,000원
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
        // 1. Bulk Fetch: 정산 집계 데이터
        // Row: [artistId, totalSales, totalFee, finalAmount, count]
        List<Object[]> settlementSummaries = settlementRepository.findAllSettlementSummariesGroupByArtist();

        // 2. Bulk Fetch: 예상 정산금 데이터
        // Row: [artistId, sourceType, amount]
        List<Object[]> pendingEstimates = pendingRepository.findAllEstimatedAmountsGroupByArtist();

        // 3. 정산 대상 ID 수집 (정산 이력 OR 대기열이 있는 모든 대상)
        Set<Long> allArtistIds = new HashSet<>();
        settlementSummaries.forEach(row -> allArtistIds.add((Long) row[0]));
        pendingEstimates.forEach(row -> allArtistIds.add((Long) row[0]));

        if (allArtistIds.isEmpty()) {
            return List.of();
        }

        // 4. 유저 정보 및 그룹명 일괄 조회
        List<Long> targetIds = new ArrayList<>(allArtistIds);
        Map<Long, User> userMap = userRepository.findAllById(targetIds)
                .stream()
                .collect(Collectors.toMap(User::getId, user -> user));

        Map<Long, String> groupNameMap = buildGroupNameMap(targetIds, userMap);

        // 5. 예상 정산금 메모리 집계 (Map<ArtistId, Amount>)
        Map<Long, Long> pendingMap = new HashMap<>();
        for (Object[] row : pendingEstimates) {
            Long artistId = (Long) row[0];
            SettlementSourceType type = (SettlementSourceType) row[1];
            Long amount = (Long) row[2]; // KRW Sales Amount

            long calculated = BigDecimal.valueOf(amount)
                    .multiply(type.getDefaultShareRatio())
                    .setScale(0, RoundingMode.FLOOR)
                    .longValue();

            pendingMap.merge(artistId, calculated, Long::sum);
        }

        // 6. 정산 집계 데이터 메모리 매핑 (Map<ArtistId, Object[]>)
        Map<Long, Object[]> summaryMap = settlementSummaries.stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> row));

        // 7. 최종 응답 생성
        List<AdminSettlementSummaryResponse> summaries = new ArrayList<>();

        for (Long targetId : targetIds) {
            User user = userMap.get(targetId);
            if (user == null) continue;

            // 정산 집계 데이터 추출
            Object[] summary = summaryMap.get(targetId);
            long totalSales = 0, totalFee = 0, totalFinal = 0, count = 0;

            if (summary != null) {
                totalSales = ((Number) summary[1]).longValue();
                totalFee = ((Number) summary[2]).longValue();
                totalFinal = ((Number) summary[3]).longValue();
                count = ((Number) summary[4]).longValue();
            }

            // 예상 정산금 추출
            long pendingEstimate = pendingMap.getOrDefault(targetId, 0L);

            String roleName = user.getRole().name();
            String nickname = user.getNickname();

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