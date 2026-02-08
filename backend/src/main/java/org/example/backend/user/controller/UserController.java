package org.example.backend.user.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.user.dto.request.BlockRequest;
import org.example.backend.user.dto.request.PasswordUpdateRequest;
import org.example.backend.user.dto.request.PhoneNumberUpdateRequest;
import org.example.backend.user.dto.request.UserProfileUpdateRequest;
import org.example.backend.user.dto.response.ArtistSearchResponse;
import org.example.backend.user.dto.response.BlockedResponse;
import org.example.backend.user.dto.response.UserMyPageResponse;
import org.example.backend.user.dto.response.UserProfileResponse;
import org.example.backend.user.service.UserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // 프로필 조회
    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getProfile(
            @AuthenticationPrincipal PrincipalDetails principalDetails
    ) {
        UserProfileResponse response = userService.getProfile(principalDetails.getUser());
        return ResponseEntity.ok(response);
    }

    // 프로필 수정
    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @Valid @RequestBody UserProfileUpdateRequest request
    ) {
        UserProfileResponse response = userService.updateProfile(principalDetails.getUser(), request);
        return ResponseEntity.ok(response);
    }

    // 비밀번호 변경
    @PutMapping("/password")
    public ResponseEntity<Void> updatePassword(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @Valid @RequestBody PasswordUpdateRequest request
    ) {
        userService.updatePassword(principalDetails.getUser(), request);
        return ResponseEntity.noContent().build();
    }

    // 전화번호 수정
    @PutMapping("/phone")
    public ResponseEntity<Void> updatePhoneNumber(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @Valid @RequestBody PhoneNumberUpdateRequest request
    ) {
        userService.updatePhoneNumber(principalDetails.getUser(), request);
        return ResponseEntity.noContent().build();
    }

    // 아티스트 목록 조회 및 검색
    @GetMapping("/artists")
    public ResponseEntity<Page<ArtistSearchResponse>> getArtists(
            @RequestParam(value = "nickname", required = false) String nickname,
            @PageableDefault(size = 10) Pageable pageable
    ) {
        Page<ArtistSearchResponse> response = userService.getArtists(nickname, pageable);
        return ResponseEntity.ok(response);
    }

    // 유저 차단
    @PostMapping("/block")
    public ResponseEntity<Void> blockUser(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @Valid @RequestBody BlockRequest request
    ) {
        userService.blockUser(principalDetails.getUser(), request);
        return ResponseEntity.noContent().build();
    }

    // 유저 차단 해제
    @DeleteMapping("/block/{userId}")
    public ResponseEntity<Void> unblockUser(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @PathVariable Long userId
    ) {
        userService.unblockUser(principalDetails.getUser(), userId);
        return ResponseEntity.noContent().build();
    }

    // 차단한 유저 목록 조회
    @GetMapping("/block")
    public ResponseEntity<Page<BlockedResponse>> getBlockedUsers(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @PageableDefault(size = 10) Pageable pageable
    ) {
        Page<BlockedResponse> response = userService.getBlockedUsers(principalDetails.getUser(), pageable);
        return ResponseEntity.ok(response);
    }

    // 아티스트 팔로우
    @PostMapping("/follow/{artistId}")
    public ResponseEntity<Void> followArtist(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @PathVariable Long artistId
    ) {
        userService.followArtist(principalDetails.getUser(), artistId);
        return ResponseEntity.noContent().build();
    }

    // 아티스트 팔로우 취소
    @DeleteMapping("/follow/{artistId}")
    public ResponseEntity<Void> unfollowArtist(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @PathVariable Long artistId
    ) {
        userService.unfollowArtist(principalDetails.getUser(), artistId);
        return ResponseEntity.noContent().build();
    }

    // 내가 팔로우한 아티스트 목록 (페이징)
    @GetMapping("/followings")
    public ResponseEntity<Page<ArtistSearchResponse>> getMyFollowings(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @PageableDefault(size = 10) Pageable pageable
    ) {
        Page<ArtistSearchResponse> response = userService.getMyFollowings(principalDetails.getUser(), pageable);
        return ResponseEntity.ok(response);
    }

    // 팔로워 수 조회 (아티스트)
    @GetMapping("/followers/count")
    public ResponseEntity<Long> getMyFollowerCount(
            @AuthenticationPrincipal PrincipalDetails principalDetails
    ) {
        long count = userService.getMyFollowerCount(principalDetails.getUser());
        return ResponseEntity.ok(count);
    }

    // 유저 마이페이지 조회
    @GetMapping("/mypage")
    public ResponseEntity<UserMyPageResponse> getMyPage(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @PageableDefault(size = 10) Pageable pageable
    ) {
        UserMyPageResponse response = userService.getMyPage(
                principalDetails.getUser(),
                pageable
        );
        return ResponseEntity.ok(response);
    }
}
