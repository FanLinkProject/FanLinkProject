package org.example.backend.media_asset.service;

import org.example.backend.media_asset.dto.request.PresignItemRequest;
import org.example.backend.media_asset.entity.MediaAssetCategory;
import org.example.backend.media_asset.entity.MediaAssetScope;
import org.example.backend.media_asset.exception.MediaAssetErrorCode;
import org.example.backend.media_asset.exception.MediaAssetException;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.UUID;

@Component
public class ObjectKeyGenerator {

    private static final int MAX_EXT_LENGTH = 10;

    // 요청 정보를 기반으로 규칙에 맞는 objectKey를 생성한다.
    public String generate(PresignItemRequest item) {
        String ext = sanitizeExt(item.ext());
        String uuid = UUID.randomUUID().toString();
        String prefix = resolvePrefix(item.category(), item.scope(), item.ownerUserId(),
                item.postIdOrTemp(), item.replayIdOrTemp());

        return switch (item.category()) {
            case PROFILE_IMAGE -> prefix + uuid + "." + ext;
            case POST_IMAGE -> prefix + uuid + "." + ext;
            case POST_VIDEO -> prefix + uuid + ".mp4";
            case REPLAY_VIDEO -> prefix + "source." + ext;
            case REPLAY_THUMBNAIL -> prefix + "thumbnail." + ext;
        };
    }

    // objectKey의 기본 안전성(빈값/상위 경로 등)을 검사한다.
    public boolean isObjectKeySafe(String objectKey) {
        return objectKey != null
                && !objectKey.isBlank()
                && !objectKey.startsWith("/")
                && !objectKey.contains("..");
    }

    // 카테고리/스코프/식별자에 따라 prefix를 조합한다.
    private String resolvePrefix(MediaAssetCategory category,
                                 MediaAssetScope scope,
                                 Long ownerUserId,
                                 String postIdOrTemp,
                                 String replayIdOrTemp) {
        String base = switch (category) {
            case PROFILE_IMAGE -> "profiles/" + requireValue(ownerUserId, "ownerUserId") + "/";
            case POST_IMAGE, POST_VIDEO -> "posts/" + (category == MediaAssetCategory.POST_IMAGE ? "images/" : "videos/")
                    + requireText(postIdOrTemp, "postIdOrTemp") + "/";
            case REPLAY_VIDEO, REPLAY_THUMBNAIL -> "live/replays/" + requireText(replayIdOrTemp, "replayIdOrTemp") + "/";
        };

        if (scope == MediaAssetScope.RESTRICTED) {
            return "restricted/" + base;
        }
        return base;
    }

    // 확장자에 대한 기본 sanitize(영숫자/길이 제한)를 수행한다.
    private String sanitizeExt(String ext) {
        if (ext == null) {
            throw new MediaAssetException(MediaAssetErrorCode.INVALID_OBJECT_KEY);
        }
        String cleaned = ext.trim().toLowerCase(Locale.ROOT);
        if (cleaned.isEmpty() || cleaned.length() > MAX_EXT_LENGTH) {
            throw new MediaAssetException(MediaAssetErrorCode.INVALID_OBJECT_KEY);
        }
        if (!cleaned.matches("[a-z0-9]+")) {
            throw new MediaAssetException(MediaAssetErrorCode.INVALID_OBJECT_KEY);
        }
        return cleaned;
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
}
