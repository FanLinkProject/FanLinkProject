package org.example.backend.concert.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.media_asset.entity.MediaAsset;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "concert_media_assets",
    indexes = {
        @Index(name = "idx_concert_media_assets_concert_id", columnList = "concert_id"),
        @Index(name = "idx_concert_media_assets_media_asset_id", columnList = "media_asset_id")
    }
)
public class ConcertMediaAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "concert_id", nullable = false)
    private Concert concert;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private ConcertMediaAssetType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "media_asset_id", nullable = false)
    private MediaAsset mediaAsset;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public ConcertMediaAsset(Concert concert, ConcertMediaAssetType type, MediaAsset mediaAsset) {
        this.concert = concert;
        this.type = type;
        this.mediaAsset = mediaAsset;
    }

    void setConcert(Concert concert) {
        this.concert = concert;
    }
}
