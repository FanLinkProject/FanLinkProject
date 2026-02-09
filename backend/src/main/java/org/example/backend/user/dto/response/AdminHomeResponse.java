package org.example.backend.user.dto.response;

import java.util.List;

// 관리자 메인 홈 response dto
public record AdminHomeResponse(
        UserStatistics userStatistics,
        ArtistStatistics artistStatistics,
        ReportStatistics reportStatistics
) {
    // 유저 통계
    public record UserStatistics(
            Long totalUsers,              // 전체 가입자 수
            Long newUsersToday,          // 오늘 신규 가입자 수
            Long dau,                    // Daily Active Users (오늘 가입한 유저 수로 근사치)
            Long mau                     // Monthly Active Users (최근 30일간 가입한 유저 수로 근사치)
    ) {
    }

    // 아티스트 통계
    public record ArtistStatistics(
            Long totalArtists,           // 전체 아티스트 수 (개인 아티스트만)
            Long totalGroups             // 전체 그룹 수
    ) {
    }

    // 신고 통계
    public record ReportStatistics(
            Long pendingReports,         // 대기 중인 신고 건수
            Long completedReports        // 처리 완료된 신고 건수
    ) {
    }
}
