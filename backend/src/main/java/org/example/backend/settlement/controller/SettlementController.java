package org.example.backend.settlement.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.settlement.dto.response.*;
import org.example.backend.settlement.service.SettlementDashboardService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/settlements")
@RequiredArgsConstructor
public class SettlementController {

    private final SettlementDashboardService dashboardService;

    // ===== [아티스트용 API] =====

    /**
     * 이번 달 정산 예상 금액 (Pending)
     * GET /api/settlements/estimated
     */
    @GetMapping("/estimated")
    public ResponseEntity<SettlementEstimateResponse> getEstimatedAmount(
            @AuthenticationPrincipal PrincipalDetails principalDetails
    ) {
        Long artistId = principalDetails.getUser().getId();
        return ResponseEntity.ok(dashboardService.getEstimatedAmount(artistId));
    }

    /**
     * 정산 지급 내역 목록 (History)
     * GET /api/settlements/history
     */
    @GetMapping("/history")
    public ResponseEntity<List<SettlementHistoryResponse>> getHistory(
            @AuthenticationPrincipal PrincipalDetails principalDetails
    ) {
        Long artistId = principalDetails.getUser().getId();
        return ResponseEntity.ok(dashboardService.getSettlementHistory(artistId));
    }

    /**
     * 상세 페이지: 특정 정산서의 상세 항목 (Details)
     * GET /api/settlements/{settlementId}/details
     */
    @GetMapping("/{settlementId}/details")
    public ResponseEntity<List<SettlementDetailResponse>> getDetails(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @PathVariable Long settlementId
    ) {
        Long artistId = principalDetails.getUser().getId();
        return ResponseEntity.ok(dashboardService.getSettlementDetails(artistId, settlementId));
    }

    // ===== [관리자용 API] =====

    /**
     * [관리자] 아티스트별 정산 요약 목록 조회
     * 각 아티스트의 누적 정산 현황과 이번 달 예상 정산금을 반환합니다.
     * GET /api/settlements/admin/summaries
     */
    @GetMapping("/admin/summaries")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AdminSettlementSummaryResponse>> getAdminSummaries() {
        return ResponseEntity.ok(dashboardService.getAdminSettlementSummaries());
    }

    /**
     * [관리자] 전체 정산 내역 조회 (페이징)
     * 모든 아티스트의 정산 내역을 최신순으로 반환합니다.
     * GET /api/settlements/admin/history
     */
    @GetMapping("/admin/history")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<AdminSettlementHistoryResponse>> getAdminAllHistory(
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(dashboardService.getAdminAllSettlements(pageable));
    }

    /**
     * [관리자] 특정 아티스트의 정산 내역 조회 (페이징)
     * GET /api/settlements/admin/artists/{artistId}/history
     */
    @GetMapping("/admin/artists/{artistId}/history")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<AdminSettlementHistoryResponse>> getAdminArtistHistory(
            @PathVariable Long artistId,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(dashboardService.getAdminArtistSettlements(artistId, pageable));
    }

    /**
     * [관리자] 특정 아티스트의 이번 달 정산 예상 금액 조회
     * GET /api/settlements/admin/artists/{artistId}/estimated
     */
    @GetMapping("/admin/artists/{artistId}/estimated")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SettlementEstimateResponse> getAdminArtistEstimate(
            @PathVariable Long artistId
    ) {
        return ResponseEntity.ok(dashboardService.getAdminArtistEstimate(artistId));
    }

    /**
     * [관리자] 특정 정산서의 상세 내역 조회 (아티스트 권한 검증 없이)
     * GET /api/settlements/admin/{settlementId}/details
     */
    @GetMapping("/admin/{settlementId}/details")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<SettlementDetailResponse>> getAdminSettlementDetails(
            @PathVariable Long settlementId
    ) {
        return ResponseEntity.ok(dashboardService.getAdminSettlementDetails(settlementId));
    }
}