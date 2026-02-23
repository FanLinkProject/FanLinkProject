package org.example.backend.user.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.user.dto.request.ArtistProfileUpdateRequest;
import org.example.backend.user.dto.response.ArtistDashboardKpiResponse;
import org.example.backend.user.dto.response.ArtistHomeResponse;
import org.example.backend.user.dto.response.ArtistMyPageResponse;
import org.example.backend.user.service.ArtistService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/artist")
@RequiredArgsConstructor
public class ArtistController {

    private final ArtistService artistService;

    // 아티스트 메인 홈 화면
    @GetMapping("/home")
    public ResponseEntity<ArtistHomeResponse> getArtistHome(
            @AuthenticationPrincipal PrincipalDetails principalDetails
    ) {
        ArtistHomeResponse response = artistService.getArtistHome(principalDetails.getUser());
        return ResponseEntity.ok(response);
    }

    // 운영 요약(대시보드) KPI
    @GetMapping("/dashboard/summary")
    public ResponseEntity<ArtistDashboardKpiResponse> getDashboardSummary(
            @AuthenticationPrincipal PrincipalDetails principalDetails
    ) {
        ArtistDashboardKpiResponse response = artistService.getDashboardKpis(principalDetails.getUser());
        return ResponseEntity.ok(response);
    }

    // 아티스트 마이페이지 조회
    @GetMapping("/mypage")
    public ResponseEntity<ArtistMyPageResponse> getMyPage(
            @AuthenticationPrincipal PrincipalDetails principalDetails
    ) {
        ArtistMyPageResponse response = artistService.getMyPage(principalDetails.getUser());
        return ResponseEntity.ok(response);
    }

    // 아티스트 프로필 수정 (소개, 프로필 이미지, 배너, 공식 링크)
    @PatchMapping("/profile")
    public ResponseEntity<ArtistMyPageResponse.Profile> updateProfile(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @Valid @RequestBody ArtistProfileUpdateRequest request
    ) {
        ArtistMyPageResponse.Profile profile = artistService.updateArtistProfile(principalDetails.getUser(), request);
        return ResponseEntity.ok(profile);
    }
}

