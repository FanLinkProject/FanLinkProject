package org.example.backend.media_asset.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Table(name = "media_assets", uniqueConstraints = {
        @UniqueConstraint(columnNames = "objectKey")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MediaAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long ownerUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private MediaAssetCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MediaAssetScope scope;

    @Column(nullable = false, unique = true, length = 512)
    private String objectKey;

    @Column(nullable = false, length = 100)
    private String contentTypeRequested;

    @Column(nullable = false)
    private Long sizeBytesRequested;

    private Long durationSecondsRequested;

    @Column(length = 100)
    private String contentTypeActual;

    private Long sizeBytesActual;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MediaAssetStatus status;

    @Column(nullable = false)
    private Instant expiresAt;

    @Enumerated(EnumType.STRING)
    @Column(length = 40)
    private MediaAssetRejectedReason rejectedReason;

    private Instant deletedAt;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private Instant updatedAt;

    public MediaAsset(Long ownerUserId,
                      MediaAssetCategory category,
                      MediaAssetScope scope,
                      String objectKey,
                      String contentTypeRequested,
                      Long sizeBytesRequested,
                      Long durationSecondsRequested,
                      Instant expiresAt
    ) {
        this.ownerUserId = ownerUserId;
        this.category = category;
        this.scope = scope;
        this.objectKey = objectKey;
        this.contentTypeRequested = contentTypeRequested;
        this.sizeBytesRequested = sizeBytesRequested;
        this.durationSecondsRequested = durationSecondsRequested;
        this.expiresAt = expiresAt;
        this.status = MediaAssetStatus.INITIATED;
    }

    // 업로드 검증 성공 시 READY로 전환하고 실제 메타데이터를 기록한다.
    public void markReady(String contentTypeActual, Long sizeBytesActual) {
        this.status = MediaAssetStatus.READY;
        this.contentTypeActual = contentTypeActual;
        this.sizeBytesActual = sizeBytesActual;
        this.rejectedReason = null;
    }

    // 업로드 검증 실패 시 REJECTED로 전환하고 실패 사유를 기록한다.
    public void markRejected(MediaAssetRejectedReason reason, String contentTypeActual, Long sizeBytesActual) {
        this.status = MediaAssetStatus.REJECTED;
        this.rejectedReason = reason;
        this.contentTypeActual = contentTypeActual;
        this.sizeBytesActual = sizeBytesActual;
    }

    // 만료된 INITIATED를 ORPHAN으로 전이한다.
    public void markOrphan(Instant deletedAt) {
        this.status = MediaAssetStatus.ORPHAN;
        this.deletedAt = deletedAt;
    }

    // 명시적 삭제 상태로 전환한다.
    public void markDeleted(Instant deletedAt) {
        this.status = MediaAssetStatus.DELETED;
        this.deletedAt = deletedAt;
    }

    // READY/REJECTED/ORPHAN/DELETED 여부를 확인한다.
    public boolean isTerminal() {
        return status == MediaAssetStatus.READY
                || status == MediaAssetStatus.REJECTED
                || status == MediaAssetStatus.ORPHAN
                || status == MediaAssetStatus.DELETED;
    }
}
