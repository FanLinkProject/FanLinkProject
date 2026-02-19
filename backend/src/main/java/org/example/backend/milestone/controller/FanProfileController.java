package org.example.backend.milestone.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.milestone.dto.response.FanProfileResponse;
import org.example.backend.milestone.service.FanProfileService;
import org.example.backend.milestone.service.JoinDaysScheduler;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/fan-profiles")
public class FanProfileController {

    private final FanProfileService fanProfileService;
    private final JoinDaysScheduler joinDaysScheduler;

    /**
     * 내 팬 프로필 목록 조회 (아티스트별)
     */
    @GetMapping("/me")
    public ResponseEntity<List<FanProfileResponse>> getMyFanProfiles(
            @AuthenticationPrincipal PrincipalDetails principal
    ) {
        List<FanProfileResponse> list = fanProfileService.getMyFanProfiles(principal.getUserId());
        return ResponseEntity.ok(list);
    }

    /**
     * 팬 프로필 생성 (테스트용 - artistId로 해당 아티스트에 대한 프로필 생성)
     */
    @PostMapping
    public ResponseEntity<FanProfileResponse> createFanProfile(
            @AuthenticationPrincipal PrincipalDetails principal,
            @RequestBody Map<String, Long> body
    ) {
        Long artistId = body.get("artistId");
        if (artistId == null) {
            return ResponseEntity.badRequest().build();
        }
        FanProfileResponse response = fanProfileService.createFanProfile(principal.getUserId(), artistId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/{id}/increase-post")
    public ResponseEntity<Void> increasePost(@PathVariable Long id, @AuthenticationPrincipal PrincipalDetails principal) {
        fanProfileService.increasePostCount(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/increase-comment")
    public ResponseEntity<Void> increaseComment(@PathVariable Long id, @AuthenticationPrincipal PrincipalDetails principal) {
        fanProfileService.increaseCommentCount(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/decrease-post")
    public ResponseEntity<Void> decreasePost(@PathVariable Long id, @AuthenticationPrincipal PrincipalDetails principal) {
        fanProfileService.decreasePostCount(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/decrease-comment")
    public ResponseEntity<Void> decreaseComment(@PathVariable Long id, @AuthenticationPrincipal PrincipalDetails principal) {
        fanProfileService.decreaseCommentCount(id);
        return ResponseEntity.ok().build();
    }

    /**
     * 본인 팬 프로필만 방문일 체크 (path id + 서비스에서 본인 여부 검사)
     */
    @PostMapping("/{id}/increase-visit")
    public ResponseEntity<Void> increaseVisit(@PathVariable Long id, @AuthenticationPrincipal PrincipalDetails principal) {
        fanProfileService.increaseVisitCount(id, principal.getUserId());
        return ResponseEntity.ok().build();
    }


    /**
     * 테스트용: 특정 팬 프로필의 가입일수 증가
     */
    @PostMapping("/{id}/increase-join-days")
    public ResponseEntity<Void> increaseJoinDays(@PathVariable Long id, @AuthenticationPrincipal PrincipalDetails principal) {
        fanProfileService.increaseJoinDays(id);
        return ResponseEntity.ok().build();
    }

    /**
     * 테스트용: 모든 팬 프로필의 가입일수를 일괄 증가 (스케줄러 수동 실행)
     * POST /api/fan-profiles/test/increment-all-join-days
     */
    @PostMapping("/test/increment-all-join-days")
    public ResponseEntity<String> incrementAllJoinDays() {
        joinDaysScheduler.manualIncrementJoinDays();
        return ResponseEntity.ok("모든 팬 프로필의 가입일수 증가 완료");
    }
}
