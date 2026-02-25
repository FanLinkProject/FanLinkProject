package org.example.backend.replay.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.replay.dto.ReplayAccessResult;
import org.example.backend.replay.dto.ReplayCandidateResponse;
import org.example.backend.replay.dto.ReplayCreateManualRequest;
import org.example.backend.replay.dto.ReplayCreateManualResponse;
import org.example.backend.replay.dto.ReplayPublishRequest;
import org.example.backend.replay.dto.ReplayPublishResponse;
import org.example.backend.replay.dto.ReplayResponse;
import org.example.backend.replay.service.ReplayCommandService;
import org.example.backend.replay.service.ReplayQueryService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/replays")
@RequiredArgsConstructor
public class ReplayController {

    private final ReplayQueryService replayQueryService;
    private final ReplayCommandService replayCommandService;

    // 아티스트별 발행된 Replay 목록을 조회한다. (공개용)
    @GetMapping
    public ResponseEntity<List<ReplayResponse>> listByArtist(
            @RequestParam("artistId") Long artistId
    ) {
        return ResponseEntity.ok(replayQueryService.listByArtist(artistId));
    }

    // Replay 후보 목록을 조회한다.
    @GetMapping("/candidates")
    public ResponseEntity<List<ReplayCandidateResponse>> listCandidates(
            @RequestParam("artistId") Long artistId,
            @AuthenticationPrincipal PrincipalDetails principalDetails
    ) {
        Long userId = principalDetails != null ? principalDetails.getUserId() : null;
        return ResponseEntity.ok(replayQueryService.listCandidates(artistId, userId,
                principalDetails != null ? principalDetails.getUser().getRole() : null));
    }

    /** 다시보기 수동 업로드 슬롯 생성. 반환된 replayId로 영상 presign 업로드 후 complete. */
    @PostMapping("/manual")
    public ResponseEntity<ReplayCreateManualResponse> createManual(
            @Valid @RequestBody ReplayCreateManualRequest request,
            @AuthenticationPrincipal PrincipalDetails principalDetails
    ) {
        Long userId = principalDetails != null ? principalDetails.getUserId() : null;
        return ResponseEntity.ok(replayCommandService.createManualReplay(request, userId,
                principalDetails != null ? principalDetails.getUser().getRole() : null));
    }

    /** 수동 업로드 Replay 발행. 상태가 READY일 때만 가능. */
    @PostMapping("/{replayId}/publish-manual")
    public ResponseEntity<ReplayPublishResponse> publishManual(
            @PathVariable Long replayId,
            @AuthenticationPrincipal PrincipalDetails principalDetails
    ) {
        Long userId = principalDetails != null ? principalDetails.getUserId() : null;
        return ResponseEntity.ok(replayCommandService.publishManualReplay(replayId, userId,
                principalDetails != null ? principalDetails.getUser().getRole() : null));
    }

    // Replay 발행을 처리한다.
    @PostMapping("/publish")
    public ResponseEntity<ReplayPublishResponse> publish(
            @Valid @RequestBody ReplayPublishRequest request,
            @AuthenticationPrincipal PrincipalDetails principalDetails
    ) {
        Long userId = principalDetails != null ? principalDetails.getUserId() : null;
        return ResponseEntity.ok(replayCommandService.publish(request, userId,
                principalDetails != null ? principalDetails.getUser().getRole() : null));
    }

    // Replay 단건을 조회한다.
    @GetMapping("/{replayId}")
    public ResponseEntity<ReplayResponse> getReplay(@PathVariable Long replayId) {
        return ResponseEntity.ok(replayQueryService.getReplay(replayId));
    }

    @DeleteMapping("/{replayId}")
    public ResponseEntity<Void> deleteReplay(
            @PathVariable Long replayId,
            @AuthenticationPrincipal PrincipalDetails principalDetails
    ) {
        Long userId = principalDetails != null ? principalDetails.getUserId() : null;
        replayCommandService.deleteReplay(replayId, userId,
                principalDetails != null ? principalDetails.getUser().getRole() : null);
        return ResponseEntity.noContent().build();
    }

    // Replay 접근 게이트를 처리한다.
    @PostMapping("/{replayId}/access")
    public ResponseEntity<?> access(
            @PathVariable Long replayId,
            @AuthenticationPrincipal PrincipalDetails principalDetails
    ) {
        Long userId = principalDetails != null ? principalDetails.getUserId() : null;
        ReplayAccessResult result = replayCommandService.issueAccessCookie(replayId, userId);
        HttpHeaders headers = new HttpHeaders();
        for (String cookie : result.setCookieHeaders()) {
            headers.add(HttpHeaders.SET_COOKIE, cookie);
        }
        return ResponseEntity.ok().headers(headers).body(result.response());
    }
}
