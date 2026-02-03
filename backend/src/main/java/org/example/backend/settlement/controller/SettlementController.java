package org.example.backend.settlement.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.settlement.dto.response.SettlementDetailResponse;
import org.example.backend.settlement.dto.response.SettlementEstimateResponse;
import org.example.backend.settlement.dto.response.SettlementHistoryResponse;
import org.example.backend.settlement.service.SettlementDashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/settlements")
@RequiredArgsConstructor
public class SettlementController {

    private final SettlementDashboardService dashboardService;

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
}