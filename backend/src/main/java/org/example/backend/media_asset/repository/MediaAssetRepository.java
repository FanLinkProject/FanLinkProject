package org.example.backend.media_asset.repository;

import org.example.backend.media_asset.entity.MediaAsset;
import org.example.backend.media_asset.entity.MediaAssetStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface MediaAssetRepository extends JpaRepository<MediaAsset, Long> {

    Optional<MediaAsset> findByObjectKey(String objectKey);

    // 만료 시간이 지난 특정 상태의 미디어를 조회한다.
    List<MediaAsset> findByStatusAndExpiresAtBefore(MediaAssetStatus status, Instant now);

    // INITIATED 상태 중 만료된 항목을 조회한다.
    default List<MediaAsset> findExpiredInitiated(Instant now) {
        return findByStatusAndExpiresAtBefore(MediaAssetStatus.INITIATED, now);
    }
}
