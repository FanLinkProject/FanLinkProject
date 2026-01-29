package org.example.backend.media_asset.dto.response;

import java.util.List;

// complete 배치 응답 DTO
public record CompleteResponse(
        List<CompleteItemResponse> items
) {
}
