package org.example.backend.media_asset.dto.response;

import org.example.backend.media_asset.entity.MediaAssetRejectedReason;
import org.example.backend.media_asset.entity.MediaAssetStatus;

// complete 단건 응답 DTO (상태/사유/실제 메타)
public record CompleteItemResponse(
        Long mediaAssetId,
        String objectKey,
        MediaAssetStatus status,
        String url,
        MediaAssetRejectedReason reason,
        String actualContentType,
        Long actualSizeBytes,
        String errorCode
) {
}
