package org.example.backend.ivs.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.global.util.SecurityContextUtil;
import org.example.backend.ivs.dto.CreatePlaybackTokenRequest;
import org.example.backend.ivs.dto.CreatePlaybackTokenResponse;
import org.example.backend.ivs.exception.IvsErrorCode;
import org.example.backend.ivs.exception.IvsException;
import org.example.backend.ivs.service.IvsPlaybackTokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ivs")
@ConditionalOnProperty(prefix = "ivs.playback-auth", name = "enabled", havingValue = "true")
public class IvsPlaybackTokenController {

    private final IvsPlaybackTokenService ivsPlaybackTokenService;
    private final SecurityContextUtil securityContextUtil;

    // JWT(서비스 로그인)와 IVS Playback Token은 별개임을 전제로 발급을 처리한다.
    @PostMapping("/playback-token")
    public ResponseEntity<CreatePlaybackTokenResponse> createPlaybackToken(
            @Valid @RequestBody CreatePlaybackTokenRequest request
    ) {
        PrincipalDetails principalDetails = securityContextUtil.getPrincipalDetails();
        if (principalDetails == null) {
            throw new IvsException(IvsErrorCode.FORBIDDEN_OPERATION, "로그인이 필요합니다.");
        }
        Long userId = principalDetails.getUserId();
        CreatePlaybackTokenResponse response = ivsPlaybackTokenService.issueToken(userId, request);
        return ResponseEntity.ok(response);
    }
}
