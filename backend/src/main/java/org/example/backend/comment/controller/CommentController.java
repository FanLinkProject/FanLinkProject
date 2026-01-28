package org.example.backend.comment.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.comment.dto.request.CommentCreateRequest;
import org.example.backend.comment.dto.request.CommentUpdateRequest;
import org.example.backend.comment.dto.response.CommentResponse;
import org.example.backend.comment.service.CommentService;
import org.example.backend.global.security.details.PrincipalDetails;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal; // 핵심 import
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    // 댓글 생성
    @PostMapping("/api/posts/{postId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public Long createComment(
            @PathVariable Long postId,
            @AuthenticationPrincipal PrincipalDetails principal,
            @RequestBody @Valid CommentCreateRequest request) {
        return commentService.createComment(postId, principal.getUser(), request);
    }

    // 특정 게시글의 댓글 목록 조회
    @GetMapping("/api/posts/{postId}/comments")
    public List<CommentResponse> getComments(@PathVariable Long postId) {
        return commentService.getComments(postId);
    }

    // 댓글 수정
    @PutMapping("/api/comments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateComment(
            @PathVariable Long id,
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @RequestBody @Valid CommentUpdateRequest request) {
        commentService.updateComment(id, principalDetails.getUser(), request);
    }

    // 댓글 삭제
    @DeleteMapping("/api/comments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(
            @PathVariable Long id,
            @AuthenticationPrincipal PrincipalDetails principalDetails) {
        commentService.deleteComment(id, principalDetails.getUser());
    }
}