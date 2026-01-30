package org.example.backend.media_asset.metadata;

import java.util.Optional;

public class NoopVideoMetadataExtractor implements VideoMetadataExtractor {

    @Override
    // Sp-1에서는 실제 길이 추출을 하지 않고 비워둔다.
    public Optional<Long> extractDurationSeconds(String objectKey) {
        return Optional.empty();
    }
}
