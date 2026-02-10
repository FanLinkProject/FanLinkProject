package org.example.backend.like.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.like.dto.LikeRequest;
import org.example.backend.like.dto.LikeStatusResponse;
import org.example.backend.like.enums.LikeTarget;
import org.example.backend.like.service.LikeService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 좋아요 API 컨트롤러
 * - 팬 게시글, 아티스트 게시글, 댓글에 대한 좋아요 기능 제공
 */
@RestController
@RequestMapping("/api/likes")
@RequiredArgsConstructor
public class LikeController {

    private final LikeService likeService;

    /**
     * 좋아요 토글 (등록/취소)
     * @param principal 인증된 사용자 정보
     * @param request 좋아요 요청 DTO (targetType, targetId)
     * @return true: 좋아요 등록됨, false: 좋아요 취소됨
     */
    @PostMapping
    public ResponseEntity<Boolean> toggleLike(
            @AuthenticationPrincipal PrincipalDetails principal,
            @Valid @RequestBody LikeRequest request) {
        boolean isLiked = likeService.toggleLike(principal.getUserId(), request);
        return ResponseEntity.ok(isLiked);
    }

    /**
     * 좋아요 상태 조회 (개수 + 좋아요 여부)
     * - 게시물 상세 화면에서 사용
     *
     * @param principal 인증된 사용자 정보
     * @param targetType 좋아요 대상 타입 (FAN_POST, ARTIST_POST, COMMENT)
     * @param targetId 좋아요 대상 ID
     * @return 좋아요 개수 및 현재 사용자의 좋아요 여부
     */
    @GetMapping("/status")
    public ResponseEntity<LikeStatusResponse> getLikeStatus(
            @AuthenticationPrincipal PrincipalDetails principal,
            @RequestParam LikeTarget targetType,
            @RequestParam Long targetId) {

        LikeStatusResponse status = likeService.getLikeStatus(
                principal.getUserId(), targetType, targetId);

        return ResponseEntity.ok(status);
    }


    /**
     * 여러 게시물의 좋아요 수 일괄 조회 (N+1 문제 해결)
     * - 게시물 목록 화면에서 사용
     *
     * @param targetType 좋아요 대상 타입
     * @param targetIds 대상 ID 목록 (쉼표로 구분)
     * @return Map<targetId, 좋아요 개수>
     *
     * 예시: GET /api/likes/counts?targetType=FAN_POST&targetIds=1,2,3,4,5
     * 응답: {"1": 42, "2": 15, "3": 0, "4": 128, "5": 7}
     */
    @GetMapping("/counts")
    public ResponseEntity<Map<Long, Long>> getLikeCounts(
            @RequestParam LikeTarget targetType,
            @RequestParam List<Long> targetIds) {

        Map<Long, Long> counts = likeService.getLikeCounts(targetType, targetIds);
        return ResponseEntity.ok(counts);
    }

    /**
     * 여러 게시물에 대한 사용자의 좋아요 여부 일괄 조회 (N+1 문제 해결)
     * - 게시물 목록 화면에서 사용
     *
     * @param principal 인증된 사용자 정보
     * @param targetType 좋아요 대상 타입
     * @param targetIds 대상 ID 목록
     * @return 좋아요를 누른 대상 ID 목록
     *
     * 예시: GET /api/likes/check?targetType=FAN_POST&targetIds=1,2,3,4,5
     * 응답: [1, 3, 5] (ID 1, 3, 5에 좋아요를 눌렀음)
     */
    @GetMapping("/check")
    public ResponseEntity<List<Long>> checkLikedTargets(
            @AuthenticationPrincipal PrincipalDetails principal,
            @RequestParam LikeTarget targetType,
            @RequestParam List<Long> targetIds) {

        List<Long> likedIds = likeService.getLikedTargetIds(
                principal.getUserId(), targetType, targetIds);

        return ResponseEntity.ok(likedIds);
    }
}
