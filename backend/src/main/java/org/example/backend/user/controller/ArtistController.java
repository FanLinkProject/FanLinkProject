package org.example.backend.user.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.user.dto.response.ArtistHomeResponse;
import org.example.backend.user.dto.response.ArtistMyPageResponse;
import org.example.backend.user.service.ArtistService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    // 아티스트 마이페이지 조회
    @GetMapping("/mypage")
    public ResponseEntity<ArtistMyPageResponse> getMyPage(
            @AuthenticationPrincipal PrincipalDetails principalDetails
    ) {
        ArtistMyPageResponse response = artistService.getMyPage(principalDetails.getUser());
        return ResponseEntity.ok(response);
    }
}

