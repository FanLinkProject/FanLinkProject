package org.example.backend.comment.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CommentCreateRequest {

    @NotBlank(message = "댓글 내용은 필수입니다.")
    @Size(max = 1000, message = "댓글은 1000자를 넘을 수 없습니다.")
    private String content;

    private Long parentId; // 대댓글일 경우 부모 ID (없으면 null 허용)
}