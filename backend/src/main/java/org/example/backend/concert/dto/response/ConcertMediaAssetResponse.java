package org.example.backend.concert.dto.response;

import lombok.Builder;
import lombok.Getter;
import org.example.backend.concert.entity.ConcertMediaAssetType;
import org.example.backend.media_asset.entity.MediaAsset;

@Getter
@Builder
public class ConcertMediaAssetResponse {
    private Long mediaAssetId;
    private ConcertMediaAssetType type;
    private String objectKey;
    private String url;

    public static ConcertMediaAssetResponse from(MediaAsset mediaAsset, ConcertMediaAssetType type, String cdnBaseUrl) {
        String url = cdnBaseUrl != null && !cdnBaseUrl.isBlank()
                ? (cdnBaseUrl.endsWith("/") ? cdnBaseUrl : cdnBaseUrl + "/") + mediaAsset.getObjectKey()
                : null;
        return ConcertMediaAssetResponse.builder()
                .mediaAssetId(mediaAsset.getId())
                .type(type)
                .objectKey(mediaAsset.getObjectKey())
                .url(url)
                .build();
    }
}
