package org.example.backend.media_asset.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.media_asset.dto.request.CompleteRequest;
import org.example.backend.media_asset.dto.request.PresignRequest;
import org.example.backend.media_asset.dto.response.CompleteResponse;
import org.example.backend.media_asset.dto.response.PresignResponse;
import org.example.backend.media_asset.service.MediaAssetService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/media-assets")
@RequiredArgsConstructor
public class MediaAssetController {

    private final MediaAssetService mediaAssetService;

    // 업로드 요청 배치를 받아 presigned PUT URL을 발급한다.
    @PostMapping("/presign")
    public ResponseEntity<PresignResponse> presign(@Valid @RequestBody PresignRequest request,
                                                   @AuthenticationPrincipal PrincipalDetails principalDetails) {
        return ResponseEntity.ok(mediaAssetService.presign(request, principalDetails));
    }

    // 업로드 완료 후 objectKey 목록을 받아 S3 HEAD 검증을 수행한다.
    @PostMapping("/complete")
    public ResponseEntity<CompleteResponse> complete(@Valid @RequestBody CompleteRequest request,
                                                     @AuthenticationPrincipal PrincipalDetails principalDetails) {
        return ResponseEntity.ok(mediaAssetService.complete(request, principalDetails));
    }
}
