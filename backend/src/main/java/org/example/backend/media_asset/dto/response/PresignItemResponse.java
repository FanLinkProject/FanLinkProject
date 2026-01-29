package org.example.backend.media_asset.dto.response;

import java.time.LocalDateTime;
import java.util.Map;

// presign 단건 응답 DTO (URL/만료/헤더)
public record PresignItemResponse(
        String objectKey,
        String uploadUrl,
        LocalDateTime expiresAt,
        Map<String, String> requiredHeaders
) {
}
