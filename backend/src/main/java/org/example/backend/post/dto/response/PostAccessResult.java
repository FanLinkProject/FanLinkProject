package org.example.backend.post.dto.response;

import java.util.List;

// 게시물 첨부 접근 게이트 결과 DTO.
public record PostAccessResult(
        PostAccessResponse response,
        List<String> setCookieHeaders
) {
}
