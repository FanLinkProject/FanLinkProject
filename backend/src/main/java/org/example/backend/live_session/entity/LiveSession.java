package org.example.backend.live_session.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

import org.example.backend.live_session.enums.LiveSessionStatus;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * LiveSession
 *
 * - roomId = liveSessionId = LiveSession.id (PK)
 */
@Entity
@Table(
	name = "live_sessions",
	indexes = {
		@Index(name = "idx_live_sessions_artist_id", columnList = "artist_id"),
		@Index(name = "idx_live_sessions_channel_arn", columnList = "channel_arn"),
		@Index(name = "idx_live_sessions_status", columnList = "status"),
		@Index(name = "idx_live_sessions_artist_status", columnList = "artist_id, status")
	}
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder(toBuilder = true)
public class LiveSession {

	/**
	 * liveSessionId (PK) == roomId
	 */
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/**
	 * 방송 주체(아티스트) userId
	 */
	@Column(name = "artist_id", nullable = false)
	private Long artistId;

	@Column(name = "title", nullable = false, length = 200)
	private String title;

	/**
	 * IVS Channel ARN
	 */
	@Column(name = "channel_arn", nullable = false, length = 255)
	private String channelArn;

	/**
	 * 유료 라이브 여부
	 */
	@Column(name = "is_paid", nullable = false)
	private boolean isPaid;

	/**
	 * LIVE / ENDED / RECORDED (+ 확장 READY/REJECTED/EXPIRED)
	 */
	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, length = 20)
	private LiveSessionStatus status;

	/**
	 * 방송 시작/종료 시각 (옵션)
	 */
	@Column(name = "started_at")
	private OffsetDateTime startedAt;

	@Column(name = "ended_at")
	private OffsetDateTime endedAt;

	/**
	 * 녹화본 위치 (recording-end 이후 세팅)
	 */
	@Column(name = "recording_s3_bucket", length = 255)
	private String recordingS3Bucket;

	@Column(name = "recording_s3_prefix", length = 512)
	private String recordingS3Prefix;

	/**
	 * 후보에서 제외(만료) 처리용 (옵션)
	 */
	@Column(name = "expires_at")
	private OffsetDateTime expiresAt;

	/**
	 * createdAt / updatedAt
	 *
	 * - 프로젝트에서 Spring Data JPA Auditing(@CreatedDate/@LastModifiedDate)을 이미 쓰고 있다면
	 *   아래 2개 대신 그 방식으로 통일해도 된다.
	 * - 여기서는 엔티티 단독으로 동작하도록 Hibernate timestamp를 사용.
	 */
	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private OffsetDateTime createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	private OffsetDateTime updatedAt;

	// ==========================
	// Domain helpers (선택)
	// ==========================

	public void startNow() {
		if (this.status == null) {
			this.status = LiveSessionStatus.LIVE;
		}
		if (this.startedAt == null) {
			this.startedAt = OffsetDateTime.now();
		}
	}

	public void endNowIdempotent() {
		// 멱등 처리: 이미 ENDED/RECORDED/READY/REJECTED/EXPIRED면 200 OK (종료시간만 비어있을 때 채움)
		if (this.status == LiveSessionStatus.ENDED
			|| this.status == LiveSessionStatus.RECORDED
			|| this.status == LiveSessionStatus.READY
			|| this.status == LiveSessionStatus.REJECTED
			|| this.status == LiveSessionStatus.EXPIRED) {

			if (this.endedAt == null) {
				this.endedAt = OffsetDateTime.now();
			}
			return;
		}

		this.status = LiveSessionStatus.ENDED;
		this.endedAt = OffsetDateTime.now();
	}

	// 녹화 완료 시점을 기록하고 RECORDED로 전이한다.
	public void markRecorded(String recordingS3Bucket, String recordingS3Prefix) {
		this.status = LiveSessionStatus.RECORDED;
		if (this.endedAt == null) {
			this.endedAt = OffsetDateTime.now();
		}
		if (recordingS3Bucket != null && !recordingS3Bucket.isBlank()) {
			this.recordingS3Bucket = recordingS3Bucket;
		}
		if (recordingS3Prefix != null && !recordingS3Prefix.isBlank()) {
			this.recordingS3Prefix = recordingS3Prefix;
		}
	}
}
