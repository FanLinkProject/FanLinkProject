package org.example.backend.user.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.user.dto.request.ArtistCreateRequest;
import org.example.backend.user.dto.request.PenaltyCreateRequest;
import org.example.backend.user.dto.response.AdminPenaltyResponse;
import org.example.backend.user.dto.response.ReportResponse;
import org.example.backend.user.dto.response.SignupResponse;
import org.example.backend.user.service.AdminService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    // 아티스트 계정 생성
    @PostMapping("/artists")
    public ResponseEntity<SignupResponse> createArtistAccount(
            @Valid @RequestBody ArtistCreateRequest request
    ) {
        SignupResponse response = adminService.createArtistAccount(request);
        return ResponseEntity.ok(response);
    }

    // 패널티 부여
    @PostMapping("/penalties")
    public ResponseEntity<AdminPenaltyResponse> givePenalty(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @Valid @RequestBody PenaltyCreateRequest request
    ) {
        AdminPenaltyResponse response = adminService.givePenalty(principalDetails.getUser(), request);
        return ResponseEntity.ok(response);
    }

    // 신고 내역 조회
    @GetMapping("/mypage/reports")
    public ResponseEntity<Page<ReportResponse>> getAllReports(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @PageableDefault(size = 10) Pageable pageable
    ) {
        Page<ReportResponse> response = adminService.getAllReports(pageable);
        return ResponseEntity.ok(response);
    }

    // 패널티 내역 조회
    @GetMapping("/mypage/penalties")
    public ResponseEntity<Page<AdminPenaltyResponse>> getMyGivenPenalties(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @PageableDefault(size = 10) Pageable pageable
    ) {
        Page<AdminPenaltyResponse> response = adminService.getMyGivenPenalties(
                principalDetails.getUser(),
                pageable
        );
        return ResponseEntity.ok(response);
    }
}
