package org.example.backend.replay.dto;

import java.util.List;

// Replay 접근 게이트 결과(응답 + 쿠키) DTO.
public record ReplayAccessResult(
        ReplayAccessResponse response,
        List<String> setCookieHeaders
) {
}
