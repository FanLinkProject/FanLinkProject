package org.example.backend.media_asset.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.media_asset.dto.request.PresignItemRequest;
import org.example.backend.media_asset.entity.MediaAssetCategory;
import org.example.backend.media_asset.entity.MediaAssetScope;
import org.example.backend.media_asset.exception.MediaAssetErrorCode;
import org.example.backend.media_asset.exception.MediaAssetException;
import org.example.backend.media_asset.gateway.FanPageGateway;
import org.example.backend.media_asset.gateway.PostGateway;
import org.example.backend.media_asset.gateway.ProductGateway;
import org.example.backend.media_asset.gateway.ReplayGateway;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.service.ArtistPermissionService;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MediaOwnershipValidator {

    private static final String TEMP_PREFIX = "tmp_";

    private final FanPageGateway fanPageGateway;
    private final PostGateway postGateway;
    private final ReplayGateway replayGateway;
    private final ProductGateway productGateway;
    private final ArtistPermissionService artistPermissionService;

    // Presign 요청의 소유/권한 규칙을 검증한다.
    public void validatePresignOwnership(PresignItemRequest item, Long userId, UserRole role) {
        if (userId == null || role == null) {
            throw new MediaAssetException(MediaAssetErrorCode.MEDIA_ASSET_ACCESS_DENIED);
        }
        MediaAssetCategory category = item.category();
        if (category == MediaAssetCategory.PROFILE_IMAGE) {
            validateProfileOwner(userId);
            return;
        }
        if (category == MediaAssetCategory.ARTIST_COVER_IMAGE) {
            validateCoverOwnership(item, userId, role);
            return;
        }
        if (category == MediaAssetCategory.POST_IMAGE || category == MediaAssetCategory.POST_VIDEO) {
            validatePostOwnership(item, userId, role);
            return;
        }
        if (category == MediaAssetCategory.PRODUCT_IMAGE || category == MediaAssetCategory.PRODUCT_DESCRIBE_IMAGE) {
            validateProductOwnership(item, userId, role);
            return;
        }
        validateReplayOwnership(item, userId, role);
    }

    // 프로필 업로드는 본인만 허용한다.
    private void validateProfileOwner(Long userId) {
        if (userId == null || userId <= 0) {
            throw new MediaAssetException(MediaAssetErrorCode.INVALID_OBJECT_KEY, "userId가 필요합니다.");
        }
        if (userId <= 0) {
            throw new MediaAssetException(MediaAssetErrorCode.MEDIA_ASSET_ACCESS_DENIED);
        }
    }

    // 커버 이미지는 팬페이지 관리 계정만 허용한다.
    private void validateCoverOwnership(PresignItemRequest item, Long userId, UserRole role) {
        Long artistId = requireValue(item.artistId(), "artistId");
        if (!isManageAccountOwner(artistId, userId, role)) {
            throw new MediaAssetException(MediaAssetErrorCode.MEDIA_ASSET_ACCESS_DENIED);
        }
    }

    // 게시물(공지 포함) 첨부 업로드는 팬페이지 관리 계정만 허용한다.
    private void validatePostOwnership(PresignItemRequest item, Long userId, UserRole role) {
        Long artistId = resolveArtistIdForPost(item);
        if (!isManageAccountOwner(artistId, userId, role)) {
            throw new MediaAssetException(MediaAssetErrorCode.MEDIA_ASSET_ACCESS_DENIED);
        }
        if (item.scope() == MediaAssetScope.RESTRICTED) {
            return;
        }
    }

    // 다시보기 업로드 권한을 검증한다.
    private void validateReplayOwnership(PresignItemRequest item, Long userId, UserRole role) {
        Long artistId = resolveArtistIdForReplay(item);
        if (!isArtistOwner(artistId, userId, role)) {
            throw new MediaAssetException(MediaAssetErrorCode.MEDIA_ASSET_ACCESS_DENIED);
        }
    }

    // 상품 이미지 업로드 권한을 검증한다.
    private void validateProductOwnership(PresignItemRequest item, Long userId, UserRole role) {
        Long artistId = resolveArtistIdForProduct(item);
        if (!isManageAccountOwner(artistId, userId, role)) {
            throw new MediaAssetException(MediaAssetErrorCode.MEDIA_ASSET_ACCESS_DENIED);
        }
    }

    // postIdOrTemp로 아티스트 ID를 조회한다.
    private Long resolveArtistIdForPost(PresignItemRequest item) {
        String postIdOrTemp = requireText(item.postIdOrTemp(), "postIdOrTemp");
        if (postIdOrTemp.startsWith(TEMP_PREFIX)) {
            return requireValue(item.artistId(), "artistId");
        }
        Long postId = parseId(postIdOrTemp, "postIdOrTemp");
        return postGateway.getArtistIdByPostId(postId);
    }

    // replayIdOrTemp로 아티스트 ID를 조회한다.
    private Long resolveArtistIdForReplay(PresignItemRequest item) {
        String replayIdOrTemp = requireText(item.replayIdOrTemp(), "replayIdOrTemp");
        if (replayIdOrTemp.startsWith(TEMP_PREFIX)) {
            return requireValue(item.artistId(), "artistId");
        }
        Long replayId = parseId(replayIdOrTemp, "replayIdOrTemp");
        return replayGateway.getArtistIdByReplayId(replayId);
    }

    // productIdOrTemp로 아티스트 ID를 조회한다.
    private Long resolveArtistIdForProduct(PresignItemRequest item) {
        String productIdOrTemp = requireText(item.productIdOrTemp(), "productIdOrTemp");
        if (productIdOrTemp.startsWith(TEMP_PREFIX)) {
            return requireValue(item.artistId(), "artistId");
        }
        Long productId = parseId(productIdOrTemp, "productIdOrTemp");
        return productGateway.getArtistIdByProductId(productId);
    }

    // 아티스트 본인 여부를 판단한다.
    private boolean isArtistOwner(Long artistId, Long userId, UserRole role) {
        Long ownerUserId = fanPageGateway.getOwnerUserId(artistId);
        return (role == UserRole.ARTIST || role == UserRole.GROUP) && ownerUserId.equals(userId);
    }

    // 팬페이지 관리 계정 본인 여부를 판단한다.
    private boolean isManageAccountOwner(Long artistId, Long userId, UserRole role) {
        Long ownerUserId = fanPageGateway.getOwnerUserId(artistId);
        if (!ownerUserId.equals(userId)) {
            return false;
        }
        return artistPermissionService.isManageAccount(userId, role);
    }

    // 숫자 필수값 유효성 검사.
    private Long requireValue(Long value, String field) {
        if (value == null || value <= 0) {
            throw new MediaAssetException(MediaAssetErrorCode.INVALID_OBJECT_KEY, field + "가 필요합니다.");
        }
        return value;
    }

    // 문자열 필수값 유효성 검사.
    private String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new MediaAssetException(MediaAssetErrorCode.INVALID_OBJECT_KEY, field + "가 필요합니다.");
        }
        return value;
    }

    // ID 문자열을 Long으로 파싱한다.
    private Long parseId(String value, String field) {
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException ex) {
            throw new MediaAssetException(MediaAssetErrorCode.INVALID_OBJECT_KEY, field + "가 올바르지 않습니다.");
        }
    }
}
