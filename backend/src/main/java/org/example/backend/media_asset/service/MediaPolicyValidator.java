package org.example.backend.media_asset.service;

import org.example.backend.media_asset.config.MediaProperties;
import org.example.backend.media_asset.dto.request.PresignItemRequest;
import org.example.backend.media_asset.entity.MediaAssetCategory;
import org.example.backend.media_asset.entity.MediaAssetScope;
import org.example.backend.media_asset.exception.MediaAssetErrorCode;
import org.example.backend.media_asset.exception.MediaAssetException;
import org.example.backend.user.enums.UserRole;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Set;

@Component
public class MediaPolicyValidator {

    private static final Set<String> IMAGE_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private static final Set<String> VIDEO_CONTENT_TYPES = Set.of(
            "video/mp4"
    );

    private final MediaProperties mediaProperties;

    public MediaPolicyValidator(MediaProperties mediaProperties) {
        this.mediaProperties = mediaProperties;
    }

    // Presign 요청의 전체 정책(권한/타입/용량/길이/첨부)을 검증한다.
    public void validatePresign(PresignItemRequest item, UserRole userRole) {
        String normalizedContentType = normalizeContentType(item.contentType());
        validateScope(item.scope(), userRole, item.category());
        validateContentType(item.category(), normalizedContentType);
        validateSize(item.category(), item.sizeBytes());
        validateDuration(item.category(), item.durationSecondsRequested());
        validateAttachments(item);
    }

    // 카테고리별 허용 Content-Type인지 확인한다.
    public boolean isContentTypeAllowed(MediaAssetCategory category, String contentType) {
        String normalized = normalizeContentType(contentType);
        return switch (category) {
            case PROFILE_IMAGE, ARTIST_COVER_IMAGE, POST_IMAGE, REPLAY_THUMBNAIL, PRODUCT_IMAGE, PRODUCT_DESCRIBE_IMAGE
                    -> IMAGE_CONTENT_TYPES.contains(normalized);
            case POST_VIDEO, REPLAY_VIDEO -> VIDEO_CONTENT_TYPES.contains(normalized);
        };
    }

    // 카테고리별 허용 용량 범위인지 확인한다.
    public boolean isSizeAllowed(MediaAssetCategory category, long sizeBytes) {
        if (sizeBytes <= 0) {
            return false;
        }
        return sizeBytes <= resolveMaxBytes(category);
    }

    // 카테고리별 최대 허용 용량을 반환한다.
    public long resolveMaxBytes(MediaAssetCategory category) {
        return switch (category) {
            case PROFILE_IMAGE, ARTIST_COVER_IMAGE, POST_IMAGE, REPLAY_THUMBNAIL, PRODUCT_IMAGE, PRODUCT_DESCRIBE_IMAGE
                    -> mediaProperties.getLimits().getImageBytes();
            case POST_VIDEO -> mediaProperties.getLimits().getPostVideoBytes();
            case REPLAY_VIDEO -> mediaProperties.getLimits().getReplayVideoBytes();
        };
    }

    // 카테고리별 최대 허용 재생 시간을 반환한다.
    public long resolveMaxDuration(MediaAssetCategory category) {
        return switch (category) {
            case POST_VIDEO -> mediaProperties.getLimits().getPostVideoMaxDurationSeconds();
            case REPLAY_VIDEO -> mediaProperties.getLimits().getReplayVideoMaxDurationSeconds();
            default -> 0;
        };
    }

    // 스코프/역할 조합이 정책에 맞는지 확인한다.
    private void validateScope(MediaAssetScope scope, UserRole userRole, MediaAssetCategory category) {
        if (category == MediaAssetCategory.REPLAY_THUMBNAIL && scope == MediaAssetScope.RESTRICTED) {
            throw new MediaAssetException(MediaAssetErrorCode.MEDIA_ASSET_UPLOAD_NOT_ALLOWED);
        }
        if (category == MediaAssetCategory.PROFILE_IMAGE && scope == MediaAssetScope.RESTRICTED) {
            throw new MediaAssetException(MediaAssetErrorCode.MEDIA_ASSET_ACCESS_DENIED);
        }
        if ((category == MediaAssetCategory.ARTIST_COVER_IMAGE
                || category == MediaAssetCategory.PRODUCT_IMAGE
                || category == MediaAssetCategory.PRODUCT_DESCRIBE_IMAGE)
                && scope == MediaAssetScope.RESTRICTED) {
            throw new MediaAssetException(MediaAssetErrorCode.MEDIA_ASSET_ACCESS_DENIED);
        }
        if (scope == MediaAssetScope.RESTRICTED && userRole != UserRole.ARTIST) {
            throw new MediaAssetException(MediaAssetErrorCode.MEDIA_ASSET_ACCESS_DENIED);
        }
    }

    // Content-Type 허용 정책을 검증한다.
    private void validateContentType(MediaAssetCategory category, String contentType) {
        if (!isContentTypeAllowed(category, contentType)) {
            throw new MediaAssetException(MediaAssetErrorCode.INVALID_MEDIA_ASSET_TYPE);
        }
    }

    // 용량 상한 정책을 검증한다.
    private void validateSize(MediaAssetCategory category, Long sizeBytes) {
        if (sizeBytes == null || sizeBytes <= 0) {
            throw new MediaAssetException(MediaAssetErrorCode.INVALID_MEDIA_ASSET_SIZE, "sizeBytes가 올바르지 않습니다.");
        }
        long maxBytes = resolveMaxBytes(category);
        if (sizeBytes > maxBytes) {
            throw new MediaAssetException(MediaAssetErrorCode.MEDIA_ASSET_SIZE_EXCEEDED, "sizeBytes 상한을 초과했습니다.");
        }
    }

    // 영상 길이 상한 정책을 검증한다.
    private void validateDuration(MediaAssetCategory category, Long durationSecondsRequested) {
        if (category == MediaAssetCategory.POST_VIDEO || category == MediaAssetCategory.REPLAY_VIDEO) {
            if (durationSecondsRequested == null || durationSecondsRequested <= 0) {
                throw new MediaAssetException(MediaAssetErrorCode.INVALID_MEDIA_ASSET_DURATION, "durationSecondsRequested가 필요합니다.");
            }
            long maxSeconds = resolveMaxDuration(category);
            if (durationSecondsRequested > maxSeconds) {
                throw new MediaAssetException(MediaAssetErrorCode.MEDIA_ASSET_DURATION_EXCEEDED, "durationSecondsRequested 상한을 초과했습니다.");
            }
        }
    }

    // 게시물 첨부 개수 제한을 검증한다.
    private void validateAttachments(PresignItemRequest item) {
        MediaAssetCategory category = item.category();
        if (category == MediaAssetCategory.POST_IMAGE || category == MediaAssetCategory.POST_VIDEO) {
            Integer attachmentCountInPost = item.attachmentCountInPost();
            if (attachmentCountInPost == null) {
                throw new MediaAssetException(MediaAssetErrorCode.INVALID_ATTACHMENT_COUNT, "attachmentCountInPost가 필요합니다.");
            }
            int max = mediaProperties.getAttachments().getMaxPerPost();
            if (attachmentCountInPost > max) {
                throw new MediaAssetException(MediaAssetErrorCode.ATTACHMENT_LIMIT_EXCEEDED, "첨부 개수 제한을 초과했습니다.");
            }
        }
        if (category == MediaAssetCategory.PRODUCT_IMAGE) {
            Integer attachmentCountInProduct = item.attachmentCountInProduct();
            if (attachmentCountInProduct == null) {
                throw new MediaAssetException(MediaAssetErrorCode.INVALID_ATTACHMENT_COUNT, "attachmentCountInProduct가 필요합니다.");
            }
            int max = mediaProperties.getAttachments().getMaxPerProductImages();
            if (attachmentCountInProduct > max) {
                throw new MediaAssetException(MediaAssetErrorCode.ATTACHMENT_LIMIT_EXCEEDED, "상품 이미지 첨부 개수 제한을 초과했습니다.");
            }
        }
    }

    // Content-Type 비교를 위해 소문자/공백 제거 정규화를 수행한다.
    private String normalizeContentType(String contentType) {
        if (contentType == null) {
            return "";
        }
        return contentType.trim().toLowerCase(Locale.ROOT);
    }
}
