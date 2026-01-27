package org.example.backend.settlement.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.settlement.dto.response.SettlementDetailResponse;
import org.example.backend.settlement.dto.response.SettlementEstimateResponse;
import org.example.backend.settlement.dto.response.SettlementHistoryResponse;
import org.example.backend.settlement.service.SettlementDashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

// ※ UserPrincipal은 프로젝트의 Security 설정에 맞는 UserDetails 구현체로 교체필요
// import org.example.backend.global.security.UserPrincipal;

@RestController
@RequestMapping("/api/settlements")
@RequiredArgsConstructor
public class SettlementController {

    private final SettlementDashboardService dashboardService;

    /**
     * 대시보드 상단: 이번 달 정산 예상 금액 (Pending)
     * GET /api/v1/settlements/estimated
     */
    @GetMapping("/estimated")
    public ResponseEntity<SettlementEstimateResponse> getEstimatedAmount(
            // @AuthenticationPrincipal UserPrincipal user // 실제 적용 시 주석 해제
            @RequestAttribute("artistId") Long artistId // 테스트용 임시
    ) {
        // Long artistId = user.getArtistId();
        return ResponseEntity.ok(dashboardService.getEstimatedAmount(artistId));
    }

    /**
     * 대시보드 하단: 정산 지급 내역 목록 (History)
     * GET /api/v1/settlements/history
     */
    @GetMapping("/history")
    public ResponseEntity<List<SettlementHistoryResponse>> getHistory(
            // @AuthenticationPrincipal UserPrincipal user
            @RequestAttribute("artistId") Long artistId
    ) {
        return ResponseEntity.ok(dashboardService.getSettlementHistory(artistId));
    }

    /**
     * 상세 페이지: 특정 정산서의 상세 항목 (Details)
     * GET /api/v1/settlements/{settlementId}/details
     */
    @GetMapping("/{settlementId}/details")
    public ResponseEntity<List<SettlementDetailResponse>> getDetails(
            // @AuthenticationPrincipal UserPrincipal user,
            @RequestAttribute("artistId") Long artistId,
            @PathVariable Long settlementId
    ) {
        return ResponseEntity.ok(dashboardService.getSettlementDetails(artistId, settlementId));
    }
}