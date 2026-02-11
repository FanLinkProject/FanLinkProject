package org.example.backend.chat.entity;

import jakarta.persistence.*;
import lombok.*;

import org.example.backend.chat.enums.SubscriptionStatus;
import org.example.backend.user.entity.User;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * 아티스트 채널 구독 엔티티
 *
 * 역할:
 * - 채팅 접근 권한의 Source of Truth
 * - subscribedAt: 채팅 "입장" 기준 시점
 * - expiredAt + status: 채팅 접근 차단 기준
 */
@Entity
@Table(
	name = "artist_subscriptions",
	uniqueConstraints = {
		// 동일 팬이 동일 아티스트를 중복 구독하지 못하도록 제약
		@UniqueConstraint(
			name = "uk_artist_fan",
			columnNames = {"artist_id", "fan_id"}
		)
	}
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ArtistSubscription {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/**
	 * 구독 대상 아티스트
	 */
	@Column(name = "artist_id", nullable = false)
	private Long artistId;

	/**
	 * 구독한 팬(User) ID
	 */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "fan_id", nullable = false)
	private User fan;

	/**
	 * 구독 시작 시점
	 * - 채팅 입장 기준 시점
	 */
	@CreationTimestamp
	@Column(name = "subscribed_at", nullable = false, updatable = false)
	private Instant subscribedAt;

	/**
	 * 구독 종료 시점
	 * - 만료되지 않았다면 null 가능
	 */
	@Column(name = "expired_at")
	private Instant expiredAt;

	/**
	 * 구독 상태
	 */
	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, length = 10)
	private SubscriptionStatus status;

    /* =========================
       비즈니스 편의 메서드
       ========================= */

	/**
	 * 현재 시점 기준으로 채팅 접근 가능 여부
	 */
	public boolean isActive() {
		if (status != SubscriptionStatus.ACTIVE) {
			return false;
		}
		if (expiredAt == null) {
			return true;
		}
		return expiredAt.isAfter(Instant.now());
	}

	/**
	 * 구독 만료 처리
	 */
	public void expire(Instant expiredAt) {
		this.expiredAt = expiredAt;
		this.status = SubscriptionStatus.EXPIRED;
	}
}
