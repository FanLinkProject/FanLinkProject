package org.example.backend.comment.dto;

import lombok.Builder;
import lombok.Getter;
import org.example.backend.comment.entity.Comment;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Builder
public class CommentResponseDto {
    private Long id;
    private String content;
    private Long writerId;
    private String writerType;
    private boolean isDeleted;
    private LocalDateTime createdAt;
    private List<CommentResponseDto> children; // 대댓글 리스트

    public static CommentResponseDto from(Comment comment) {
        return CommentResponseDto.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .writerId(comment.getWriterId())
                .writerType(comment.getWriterType().name())
                .isDeleted(comment.isDeleted())
                .createdAt(comment.getCreatedAt())
                // 대댓글은 Service에서 별도 매핑하거나 여기서 스트림 처리
                .children(new ArrayList<>())
                .build();
    }
}