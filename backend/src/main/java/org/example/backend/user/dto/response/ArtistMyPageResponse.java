package org.example.backend.user.dto.response;

import java.util.List;

// 아티스트 마이페이지 dto
public record ArtistMyPageResponse(
        boolean isGroupAccount,        // 그룹 계정 여부
        Profile profile,
        FanDailyGraph fanDailyGraph,
        TeamInfo teamInfo,
        Security security,
        SettlementSummary settlementSummary
){

    public record Profile(
            Long id,
            String nickname,
            String profileImageUrl,
            String bannerImageUrl,
            String bio,
            String officialLinks  // 공식 링크 (JSON 형식)
    ) {
    }

    public record FanDailyGraph(
            long totalFollowers,
            List<DailyPoint> dailyNewFollowers
    ) {
    }

    public record DailyPoint(
            String date, // yyyy-MM-dd
            long newFollowers
    ) {
    }

    public record TeamInfo(
            String type, // GROUP or ARTIST
            String groupName,
            List<Member> members
    ) {
    }

    public record Member(
            Long id,
            String nickname,
            String profileImageUrl
    ) {
    }

    public record Security(
            String changePasswordUrl
    ) {
    }

    public record SettlementSummary(
            String estimatedUrl,
            String historyUrl
    ) {
    }
}

