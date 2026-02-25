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

import java.time.Instant;

@Entity
@Table(
        name = "replays",
        uniqueConstraints = @UniqueConstraint(columnNames = {"live_session_id"}, name = "replays_live_session_id_unique")
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

    /** 라이브 세션 ID. 수동 업로드 시 null. */
    @Column(name = "live_session_id")
    private Long liveSessionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "access_type", nullable = false, length = 10)
    private ReplayAccessType accessType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ReplayStatus status;

    @Column(name = "title", length = 200)
    private String title;

    @Column(name = "recording_s3_bucket", length = 255)
    private String recordingS3Bucket;

    @Column(name = "recording_s3_prefix", length = 512)
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
    private Instant publishedAt;

    @Column(name = "reject_reason", length = 500)
    private String rejectReason;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Replay(Long artistId,
                  Long liveSessionId,
                  ReplayAccessType accessType,
                  ReplayStatus status,
                  String recordingS3Bucket,
                  String recordingS3Prefix,
                  Instant publishedAt) {
        this(artistId, liveSessionId, accessType, status, recordingS3Bucket, recordingS3Prefix, publishedAt, null);
    }

    public Replay(Long artistId,
                  Long liveSessionId,
                  ReplayAccessType accessType,
                  ReplayStatus status,
                  String recordingS3Bucket,
                  String recordingS3Prefix,
                  Instant publishedAt,
                  String title) {
        this.artistId = artistId;
        this.liveSessionId = liveSessionId;
        this.accessType = accessType;
        this.status = status;
        this.recordingS3Bucket = recordingS3Bucket;
        this.recordingS3Prefix = recordingS3Prefix;
        this.publishedAt = publishedAt;
        this.title = title;
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

    // HLS 마스터 매니페스트 키를 기록한다.
    public void updateHlsMasterManifestKey(String hlsMasterManifestKey) {
        this.hlsMasterManifestKey = hlsMasterManifestKey;
    }

    // MediaConvert 작업 ID를 기록한다.
    public void updateMediaConvertJobId(String mediaConvertJobId) {
        this.mediaConvertJobId = mediaConvertJobId;
    }

    // 거부 사유를 갱신한다.
    public void updateRejectReason(String rejectReason) {
        this.rejectReason = rejectReason;
    }

    public void updateTitle(String title) {
        this.title = title;
    }

    public void updateAccessType(ReplayAccessType accessType) {
        this.accessType = accessType;
    }

    public void markPublished(Instant at) {
        this.status = ReplayStatus.PUBLISHED;
        this.publishedAt = at;
    }
}
