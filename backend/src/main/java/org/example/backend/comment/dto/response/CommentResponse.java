package org.example.backend.comment.dto.response;

import lombok.Builder;
import lombok.Getter;
import org.example.backend.comment.entity.Comment;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Builder
public class CommentResponse {
    private Long id;
    private String content;
    private Long writerId;
    private String writerType;
    private boolean isDeleted;
    private LocalDateTime createdAt;
    private List<CommentResponse> children; // 대댓글 리스트

    public static CommentResponse from(Comment comment) {
        return CommentResponse.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .writerId(comment.getWriterId())
                .writerType(comment.getWriterType().name())
                .isDeleted(comment.getDeletedAt() != null)
                .createdAt(comment.getCreatedAt())
                .children(new ArrayList<>())
                .build();
    }
}