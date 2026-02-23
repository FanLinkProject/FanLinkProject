package org.example.backend.user.dto.request;

import jakarta.validation.constraints.Size;

/**
 * 아티스트(그룹 포함) 프로필 수정 요청.
 * 소개, 프로필 이미지, 배너, 공식 링크 (JSON 문자열).
 */
public record ArtistProfileUpdateRequest(
        @Size(max = 1000) String bio,
        String profileImageUrl,
        String bannerImageUrl,
        Long profileImageMediaAssetId,
        Long bannerImageMediaAssetId,
        String officialLinks  // JSON 예: {"instagram":"url","youtube":"url"}
) {
}
