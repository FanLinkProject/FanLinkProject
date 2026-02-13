package org.example.backend.post.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.media_asset.entity.MediaAsset;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Table(name = "post_media_assets", indexes = {
        @Index(name = "idx_post_media_assets_post_type_post_id", columnList = "post_type, post_id"),
        @Index(name = "idx_post_media_assets_media_asset_id", columnList = "media_asset_id")
})
public class PostMediaAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "post_type", nullable = false, length = 20)
    private PostMediaAssetType postType;

    @Column(name = "post_id", nullable = false)
    private Long postId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "media_asset_id", nullable = false)
    private MediaAsset mediaAsset;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public PostMediaAsset(PostMediaAssetType postType, Long postId, MediaAsset mediaAsset) {
        this.postType = postType;
        this.postId = postId;
        this.mediaAsset = mediaAsset;
    }
}
