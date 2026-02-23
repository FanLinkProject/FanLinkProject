package org.example.backend.media_asset.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.example.backend.media_asset.entity.MediaAssetCategory;
import org.example.backend.media_asset.entity.MediaAssetScope;

// presign 단건 요청에 필요한 메타데이터를 담는 DTO
public record PresignItemRequest(
        @NotNull
        MediaAssetCategory category,
        @NotNull
        MediaAssetScope scope,
        Long artistId,
        @NotBlank
        String contentType,
        @NotNull
        Long sizeBytes,
        Long durationSecondsRequested,
        @NotBlank
        String ext,
        String postIdOrTemp,
        String replayIdOrTemp,
        String productIdOrTemp,
        String concertIdOrTemp,
        Integer attachmentCountInPost,
        Integer attachmentCountInProduct
) {
}
