package org.example.backend.media_asset.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

// complete 배치 요청을 담는 DTO
public record CompleteRequest(
        @NotEmpty
        @Valid
        List<CompleteItemRequest> items
) {
}
