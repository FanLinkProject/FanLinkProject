package org.example.backend.user.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.user.dto.request.ArtistCreateRequest;
import org.example.backend.user.dto.request.PenaltyCreateRequest;
import org.example.backend.user.dto.response.AdminArtistRowResponse;
import org.example.backend.user.dto.response.AdminHomeResponse;
import org.example.backend.user.dto.response.AdminPenaltyResponse;
import org.example.backend.user.dto.response.AdminUserRowResponse;
import org.example.backend.user.dto.response.ReportResponse;
import org.example.backend.user.dto.response.SignupResponse;
import org.example.backend.user.service.AdminService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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

    // 관리자 메인 홈 화면 조회
    @GetMapping("/home")
    public ResponseEntity<AdminHomeResponse> getHome(
            @AuthenticationPrincipal PrincipalDetails principalDetails
    ) {
        AdminHomeResponse response = adminService.getHome();
        return ResponseEntity.ok(response);
    }

    // 회원 목록 (페이징, 검색)
    @GetMapping("/users")
    public ResponseEntity<Page<AdminUserRowResponse>> getUsers(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        Page<AdminUserRowResponse> response = adminService.getUsers(keyword, pageable);
        return ResponseEntity.ok(response);
    }

    // 아티스트/그룹 목록 (페이징, 검색)
    @GetMapping("/artists")
    public ResponseEntity<Page<AdminArtistRowResponse>> getArtists(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        Page<AdminArtistRowResponse> response = adminService.getArtists(keyword, pageable);
        return ResponseEntity.ok(response);
    }

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

    // 신고 내역 조회 (최신 신고가 1페이지에 오도록 created_at 내림차순, nickname/email/status 검색)
    @GetMapping("/mypage/reports")
    public ResponseEntity<Page<ReportResponse>> getAllReports(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @RequestParam(required = false) String nickname,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) Boolean status
    ) {
        Page<ReportResponse> response = adminService.getAllReports(pageable, nickname, email, status);
        return ResponseEntity.ok(response);
    }

    // 신고 기각 (처리 상태만 true로 변경)
    @PatchMapping("/mypage/reports/{reportId}/dismiss")
    public ResponseEntity<Void> dismissReport(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @PathVariable Long reportId
    ) {
        adminService.markReportProcessed(reportId);
        return ResponseEntity.noContent().build();
    }

    // 패널티 내역 조회 (created_at 최신순, 닉네임/이메일 검색)
    @GetMapping("/mypage/penalties")
    public ResponseEntity<Page<AdminPenaltyResponse>> getMyGivenPenalties(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @PageableDefault(size = 10) Pageable pageable,
            @RequestParam(required = false) String nickname,
            @RequestParam(required = false) String email
    ) {
        Page<AdminPenaltyResponse> response = adminService.getMyGivenPenalties(
                principalDetails.getUser(),
                pageable,
                nickname,
                email
        );
        return ResponseEntity.ok(response);
    }
}
