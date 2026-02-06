package org.example.backend.comment.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.comment.dto.request.CommentCreateRequest;
import org.example.backend.comment.dto.request.CommentUpdateRequest;
import org.example.backend.comment.dto.response.CommentResponse;
import org.example.backend.comment.enums.TargetType;
import org.example.backend.comment.service.CommentService;
import org.example.backend.global.security.details.PrincipalDetails;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class CommentController {
    private final CommentService commentService;

    // 부모 댓글 목록 조회 (No-offset 무한 스크롤)
    @GetMapping
    public ResponseEntity<Slice<CommentResponse>> getList(
            @RequestParam TargetType targetType,
            @RequestParam Long targetId,
            @RequestParam(required = false) Long lastId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(commentService.getComments(targetType, targetId, lastId, pageable));
    }

    // 특정 부모의 대댓글 목록 조회 — 더보기용 (No-offset 무한 스크롤)
    @GetMapping("/{parentId}/replies")
    public ResponseEntity<Slice<CommentResponse>> getReplies(
            @PathVariable Long parentId,
            @RequestParam(required = false) Long lastId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(commentService.getReplies(parentId, lastId, pageable));
    }

    // 여러 게시물의 댓글 수 일괄 조회 (게시물 목록 화면용)
    @GetMapping("/counts")
    public ResponseEntity<Map<Long, Long>> getCounts(
            @RequestParam TargetType targetType,
            @RequestParam List<Long> targetIds) {
        return ResponseEntity.ok(commentService.getCommentCounts(targetType, targetIds));
    }

    @PostMapping
    public ResponseEntity<Long> create(
            @AuthenticationPrincipal PrincipalDetails principal,
            @Valid @RequestBody CommentCreateRequest request) {
        return ResponseEntity.ok(commentService.create(request, principal.getUserId()));
    }

    @PatchMapping("/{commentId}")
    public ResponseEntity<Void> update(
            @PathVariable Long commentId,
            @AuthenticationPrincipal PrincipalDetails principal,
            @Valid @RequestBody CommentUpdateRequest request) {
        commentService.update(commentId, request.content(), principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> delete(
            @PathVariable Long commentId,
            @AuthenticationPrincipal PrincipalDetails principal) {
        // PrincipalDetails에서 User 객체를 직접 전달하여 역할 기반 권한 검증
        commentService.delete(commentId, principal.getUser());
        return ResponseEntity.noContent().build();
    }
}
