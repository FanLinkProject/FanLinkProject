package org.example.backend.milestone.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.milestone.dto.request.MilestoneRequest;
import org.example.backend.milestone.dto.response.MilestoneResponse;
import org.example.backend.milestone.service.MilestoneService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/milestones")
public class MilestoneController {

    private final MilestoneService milestoneService;

    /**
     * 마일스톤 생성
     */
    @PostMapping
    public ResponseEntity<MilestoneResponse> createMilestone(
            @AuthenticationPrincipal PrincipalDetails principal,
            @RequestBody @Valid MilestoneRequest request
    ) {
        MilestoneRequest requestWithArtist = MilestoneRequest.builder()
                .artistId(principal.getUserId())
                .name(request.getName())
                .description(request.getDescription())
                .sortOrder(request.getSortOrder())
                .autoUpgrade(request.isAutoUpgrade())
                .active(request.isActive())
                .conditions(request.getConditions())
                .build();
        MilestoneResponse response = milestoneService.createMilestone(requestWithArtist);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * 아티스트별 마일스톤 목록 조회 (sortOrder 내림차순)
     */
    @GetMapping
    public ResponseEntity<List<MilestoneResponse>> getMilestonesByArtist(
            @AuthenticationPrincipal PrincipalDetails principal
    ) {
        List<MilestoneResponse> response = milestoneService.getMilestonesByArtist(principal.getUserId());
        return ResponseEntity.ok(response);
    }

    /**
     * 마일스톤 수정
     */
    @PutMapping("/{id}")
    public ResponseEntity<MilestoneResponse> updateMilestone(
            @AuthenticationPrincipal PrincipalDetails principal,
            @PathVariable Long id,
            @RequestBody @Valid MilestoneRequest request
    ) {
        MilestoneRequest requestWithArtist = MilestoneRequest.builder()
                .artistId(principal.getUserId())
                .name(request.getName())
                .description(request.getDescription())
                .sortOrder(request.getSortOrder())
                .autoUpgrade(request.isAutoUpgrade())
                .active(request.isActive())
                .conditions(request.getConditions())
                .build();
        MilestoneResponse response = milestoneService.updateMilestone(id, requestWithArtist);
        return ResponseEntity.ok(response);
    }

    /**
     * 마일스톤 삭제 (사용 중인 등급은 삭제 불가)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<MilestoneResponse> deleteMilestone(
            @AuthenticationPrincipal PrincipalDetails principal,
            @PathVariable Long id
    ) {
        MilestoneResponse response = milestoneService.deleteMilestone(id, principal.getUserId());
        return ResponseEntity.ok(response);
    }
}
