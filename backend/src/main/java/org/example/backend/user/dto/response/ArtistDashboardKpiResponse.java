package org.example.backend.user.dto.response;

/**
 * 운영 요약(대시보드) KPI 응답
 * - 이번 달 총 매출, 정산 가능 금액, 배송 대기 상품 수, 등록 상품 수
 */
public record ArtistDashboardKpiResponse(
        long monthlySales,           // 이번 달 총 매출 (원)
        long estimatedSettlement,    // 정산 가능 금액 (원)
        int pendingShipmentCount,   // 배송 대기 상품 건수
        int productCount            // 등록 상품 수
) {
}
