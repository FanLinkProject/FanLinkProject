package org.example.backend.media_asset.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

// presign 배치 요청을 담는 DTO
public record PresignRequest(
        @NotEmpty
        @Valid
        List<PresignItemRequest> items
) {
}
