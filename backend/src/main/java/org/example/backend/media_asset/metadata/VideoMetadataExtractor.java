package org.example.backend.media_asset.metadata;

import java.util.Optional;

public interface VideoMetadataExtractor {

    // objectKey로부터 실제 영상 길이를 추출한다(없으면 empty).
    Optional<Long> extractDurationSeconds(String objectKey);
}
