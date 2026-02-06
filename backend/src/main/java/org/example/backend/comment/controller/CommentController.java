package org.example.backend.comment.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.comment.dto.requset.CommentCreateRequest;
import org.example.backend.comment.dto.requset.CommentUpdateRequest;
import org.example.backend.comment.dto.response.CommentResponse;
import org.example.backend.comment.enums.TargetType;
import org.example.backend.comment.service.CommentService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class CommentController {
    private final CommentService commentService;

    @PostMapping
    public ResponseEntity<Long> create(@Valid @RequestBody CommentCreateRequest request) { // @Valid 추가
        return ResponseEntity.ok(commentService.create(request, 1L));
    }

    @GetMapping
    public ResponseEntity<Slice<CommentResponse>> getList(
            @RequestParam TargetType targetType,
            @RequestParam Long targetId,
            @RequestParam(required = false) Long lastId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(commentService.getComments(targetType, targetId, lastId, pageable));
    }


    @PatchMapping("/{commentId}")
    public ResponseEntity<Void> update(
            @PathVariable Long commentId,
            @Valid @RequestBody CommentUpdateRequest request) {

        // 현재는 유저 ID를 1L로 고정해서 테스트 (나중에 인증 시스템 연결 시 변경)
        commentService.update(commentId, request.content(), 1L);
        return ResponseEntity.noContent().build();
    }
}