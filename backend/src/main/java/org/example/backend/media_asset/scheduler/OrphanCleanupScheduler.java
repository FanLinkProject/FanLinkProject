package org.example.backend.media_asset.scheduler;

import lombok.RequiredArgsConstructor;
import org.example.backend.media_asset.repository.MediaAssetRepository;
import org.example.backend.media_asset.service.S3MediaClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;

@Component
@RequiredArgsConstructor
public class OrphanCleanupScheduler {

    private final MediaAssetRepository mediaAssetRepository;
    private final S3MediaClient s3MediaClient;
    private final Clock mediaClock;

    // 만료된 INITIATED를 ORPHAN으로 전이하고 S3 객체를 정리한다.
    @Scheduled(fixedDelayString = "${media.orphan-cleanup.fixed-delay-ms}")
    @Transactional
    public void cleanupExpiredInitiated() {
        Instant now = Instant.now(mediaClock);
        mediaAssetRepository.findExpiredInitiated(now).forEach(mediaAsset -> {
            mediaAsset.markOrphan(now);
            s3MediaClient.deleteObjectQuietly(mediaAsset.getObjectKey());
        });
    }
}
