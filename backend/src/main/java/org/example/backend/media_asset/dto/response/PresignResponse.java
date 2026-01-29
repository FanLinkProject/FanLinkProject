package org.example.backend.media_asset.dto.response;

import java.util.List;

// presign 배치 응답 DTO
public record PresignResponse(
        List<PresignItemResponse> items
) {
}
