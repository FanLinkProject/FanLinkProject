package org.example.backend.replay.entity;

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

import java.time.OffsetDateTime;

@Entity
@Table(
        name = "replays",
        uniqueConstraints = @UniqueConstraint(columnNames = {"live_session_id"})
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Replay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "artist_id", nullable = false)
    private Long artistId;

    @Column(name = "live_session_id", nullable = false)
    private Long liveSessionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "access_type", nullable = false, length = 10)
    private ReplayAccessType accessType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ReplayStatus status;

    @Column(name = "recording_s3_bucket", nullable = false, length = 255)
    private String recordingS3Bucket;

    @Column(name = "recording_s3_prefix", nullable = false, length = 512)
    private String recordingS3Prefix;

    @Column(name = "hls_master_manifest_key", length = 512)
    private String hlsMasterManifestKey;

    @Column(name = "mp4_key", length = 512)
    private String mp4Key;

    @Column(name = "thumbnail_key", length = 512)
    private String thumbnailKey;

    @Column(name = "media_convert_job_id", length = 128)
    private String mediaConvertJobId;

    @Column(name = "published_at")
    private OffsetDateTime publishedAt;

    @Column(name = "reject_reason", length = 500)
    private String rejectReason;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    // Replay 엔티티를 생성한다.
    public Replay(Long artistId,
                  Long liveSessionId,
                  ReplayAccessType accessType,
                  ReplayStatus status,
                  String recordingS3Bucket,
                  String recordingS3Prefix,
                  OffsetDateTime publishedAt) {
        this.artistId = artistId;
        this.liveSessionId = liveSessionId;
        this.accessType = accessType;
        this.status = status;
        this.recordingS3Bucket = recordingS3Bucket;
        this.recordingS3Prefix = recordingS3Prefix;
        this.publishedAt = publishedAt;
    }

    // Replay 상태를 변경한다.
    public void changeStatus(ReplayStatus status) {
        this.status = status;
    }

    // Replay 처리 실패 사유를 기록한다.
    public void markRejected(String reason) {
        this.status = ReplayStatus.REJECTED;
        this.rejectReason = reason;
    }

    // Replay 원본 영상 키를 기록한다.
    public void updateMp4Key(String mp4Key) {
        this.mp4Key = mp4Key;
    }

    // Replay 썸네일 키를 기록한다.
    public void updateThumbnailKey(String thumbnailKey) {
        this.thumbnailKey = thumbnailKey;
    }
}
