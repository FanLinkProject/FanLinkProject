package org.example.backend.milestone.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.milestone.dto.response.AutoUpgradeResultResponse;
import org.example.backend.milestone.service.FanGradeAutoUpgradeService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 팬 등급 자동승급 수동 실행용 컨트롤러.
 * 관리자/아티스트가 버튼 클릭 시 등급 재계산을 즉시 실행할 수 있다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/milestone/fan-grade")
public class FanGradeAutoUpgradeController {

    private final FanGradeAutoUpgradeService fanGradeAutoUpgradeService;

    /**
     * 팬 등급 자동승급을 수동으로 실행한다.
     * 자동승급이 설정된 마일스톤을 가진 아티스트의 모든 팬을 검사하여 조건 충족 시 등급을 갱신한다.
     */
    @PostMapping("/auto-upgrade")
    public ResponseEntity<AutoUpgradeResultResponse> triggerAutoUpgrade(
            @AuthenticationPrincipal PrincipalDetails principal
    ) {
        AutoUpgradeResultResponse result = fanGradeAutoUpgradeService.processAutoUpgrade();
        return ResponseEntity.ok(result);
    }
}
