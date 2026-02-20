package org.example.backend.user.dto.response;

import java.util.List;

/**
 * 관리자용: DB 내 개인 아티스트 / 그룹 / 팬 계정 정리
 */
public record AccountsSummaryResponse(
        List<AccountRow> fans,
        List<AccountRow> artists,
        List<AccountRow> groups
) {
    public record AccountRow(
            Long id,
            String nickname,
            String email,
            String role
    ) {}
}
