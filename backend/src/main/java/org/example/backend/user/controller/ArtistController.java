package org.example.backend.user.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
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

    private final ArtistService artistMyPageService;

    // 아티스트 마이페이지 조회
    @GetMapping("/mypage")
    public ResponseEntity<ArtistMyPageResponse> getMyPage(
            @AuthenticationPrincipal PrincipalDetails principalDetails
    ) {
        ArtistMyPageResponse response = artistMyPageService.getMyPage(principalDetails.getUser());
        return ResponseEntity.ok(response);
    }
}

