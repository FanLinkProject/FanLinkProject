package org.example.backend.comment.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.comment.dto.requset.CommentCreateRequest;
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
    public ResponseEntity<Long> create(@RequestBody CommentCreateRequest request) {
        return ResponseEntity.ok(commentService.create(request, 1L)); // 유저ID는 인증세션에서 가져옴
    }

    @GetMapping
    public ResponseEntity<Slice<CommentResponse>> getList(
            @RequestParam TargetType targetType,
            @RequestParam Long targetId,
            @RequestParam(required = false) Long lastId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(commentService.getComments(targetType, targetId, lastId, pageable));
    }
}