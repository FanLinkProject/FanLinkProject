package org.example.backend.comment.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.example.backend.comment.enums.TargetType;

public record CommentCreateRequest(
        @NotNull Long targetId,
        @NotNull TargetType targetType,
        @NotBlank @Size(max = 1000) String content, // 글자수 제한 추가
        Long parentId
) {}
