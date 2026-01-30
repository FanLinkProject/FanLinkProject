package org.example.backend.media_asset.dto.request;

import jakarta.validation.constraints.NotBlank;

// complete 단건 요청에서 objectKey를 전달하는 DTO
public record CompleteItemRequest(
        @NotBlank
        String objectKey
) {
}
