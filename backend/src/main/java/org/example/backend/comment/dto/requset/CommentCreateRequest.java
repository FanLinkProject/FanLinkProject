package org.example.backend.comment.dto.requset;

import org.example.backend.comment.enums.TargetType;

public record CommentCreateRequest(
        Long targetId,
        TargetType targetType,
        String content,
        Long parentId // null이면 댓글, 값이 있으면 대댓글
) {}
