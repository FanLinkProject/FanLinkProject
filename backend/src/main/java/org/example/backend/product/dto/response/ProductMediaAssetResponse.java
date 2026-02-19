package org.example.backend.product.dto.response;

import lombok.Builder;
import lombok.Getter;
import org.example.backend.media_asset.entity.MediaAsset;
import org.example.backend.media_asset.entity.MediaAssetCategory;
import org.example.backend.media_asset.entity.MediaAssetScope;

@Getter
@Builder
public class ProductMediaAssetResponse {
    private Long mediaAssetId;
    private String objectKey;
    private String url;
    private MediaAssetCategory category;
    private MediaAssetScope scope;
    private String contentType;
    private Long sizeBytes;

    /**
     * CDN baseUrl: https://{cloudfront.domain}
     */
    public static ProductMediaAssetResponse from(MediaAsset mediaAsset, String cdnBaseUrl) {
        String url = cdnBaseUrl != null && !cdnBaseUrl.isBlank()
                ? (cdnBaseUrl.endsWith("/") ? cdnBaseUrl : cdnBaseUrl + "/") + mediaAsset.getObjectKey()
                : null;
        return ProductMediaAssetResponse.builder()
                .mediaAssetId(mediaAsset.getId())
                .objectKey(mediaAsset.getObjectKey())
                .url(url)
                .category(mediaAsset.getCategory())
                .scope(mediaAsset.getScope())
                .contentType(mediaAsset.getContentTypeActual() != null ? mediaAsset.getContentTypeActual() : mediaAsset.getContentTypeRequested())
                .sizeBytes(mediaAsset.getSizeBytesActual() != null ? mediaAsset.getSizeBytesActual() : mediaAsset.getSizeBytesRequested())
                .build();
    }
}
