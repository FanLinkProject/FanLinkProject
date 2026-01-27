package org.example.backend.comment.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CommentRequest {
    private String content;
    private Long parentId; // 대댓글일 경우 부모 ID (없으면 null)
}