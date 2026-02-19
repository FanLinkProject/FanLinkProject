package org.example.backend.post.dto.response;

import java.time.Instant;

// 게시물 첨부 접근 게이트 응답 DTO.
public record PostAccessResponse(
        Long postId,
        String pathPattern,
        Instant expiresAt
) {
}
