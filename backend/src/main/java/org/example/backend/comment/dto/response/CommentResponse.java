package org.example.backend.comment.dto.response;

import org.example.backend.comment.entity.Comment;

import java.time.LocalDateTime;
import java.util.List;

public record CommentResponse(
        Long id,
        Long userId,
        String content,
        Integer status,
        LocalDateTime createdAt,
        List<CommentResponse> children // 1단계 대댓글 리스트
) {
    public static CommentResponse from(Comment entity) {
        return new CommentResponse(
                entity.getId(),
                entity.getUserId(),
                entity.getContent(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getChildren().stream()
                        .filter(child -> child.getStatus() == 1) // 정상 댓글만 포함
                        .map(CommentResponse::from)
                        .toList()
        );
    }
}