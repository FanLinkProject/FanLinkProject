package org.example.backend.live_session.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.live_session.dto.request.LiveSessionCreateRequest;
import org.example.backend.live_session.dto.response.LiveSessionCandidateResponse;
import org.example.backend.live_session.dto.response.LiveSessionCreateResponse;
import org.example.backend.live_session.dto.response.LiveSessionResponse;
import org.example.backend.live_session.entity.LiveSession;
import org.example.backend.live_session.enums.LiveSessionStatus;
import org.example.backend.live_session.exception.LiveSessionErrorCode;
import org.example.backend.live_session.exception.LiveSessionException;
import org.example.backend.live_session.repository.LiveSessionRepository;
import org.example.backend.notification.dto.request.NotificationSendRequest;
import org.example.backend.notification.entity.NotificationType;
import org.example.backend.notification.service.NotificationService;
import org.example.backend.live_session.event.LiveEndedEvent;
import org.example.backend.subscription.repository.SubscriptionRepository;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.FollowRepository;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.repository.UserRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Set;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;

/**
 * LiveSession 서비스.
 * roomId = liveSessionId = LiveSession.id (PK) — 채팅/Replay에서 해당 id를 roomId로 사용.
 */
@Service
@RequiredArgsConstructor
public class LiveSessionService {

	private final LiveSessionRepository liveSessionRepository;
	private final NotificationService notificationService;
	private final SubscriptionRepository subscriptionRepository;
	private final FollowRepository followRepository;
	private final ApplicationEventPublisher eventPublisher;
	private final UserRepository userRepository;

	/**
	 * 라이브 시작(세션 생성). ARTIST만 허용.
	 *
	 * @return 생성된 라이브 세션 정보 (id == roomId)
	 */
	@Transactional
	public LiveSessionCreateResponse startLive(User loginUser, LiveSessionCreateRequest request) {
		if (loginUser.getRole() != UserRole.ARTIST) {
			throw new LiveSessionException(LiveSessionErrorCode.LIVE_SESSION_FORBIDDEN_NOT_ARTIST);
		}
		boolean hasActiveLive = !liveSessionRepository
			.findByArtistIdAndStatusInAndNotExpired(loginUser.getId(), List.of(LiveSessionStatus.LIVE), Instant.now())
			.isEmpty();
		if (hasActiveLive) {
			throw new LiveSessionException(LiveSessionErrorCode.LIVE_SESSION_ALREADY_ACTIVE);
		}
		LiveSession session = LiveSession.builder()
			.artistId(loginUser.getId())
			.channelArn(request.getChannelArn())
			.title(request.getTitle())   // <- 이거 빠지면 지금 에러
			.isPaid(request.getIsPaid())
			.status(LiveSessionStatus.LIVE)
			.build();
		session.startNow();
		session = liveSessionRepository.save(session);

		// 라이브 시작 알림
		notifyLiveStarted(loginUser, session);

		return LiveSessionCreateResponse.builder()
			.id(session.getId())
			.channelArn(session.getChannelArn())
			.isPaid(session.isPaid())
			.status(session.getStatus())
			.startedAt(session.getStartedAt())
			.build();
	}

	/**
	 * 라이브 종료(논리 종료). ARTIST만 허용, 본인 세션만. 멱등 처리.
	 */
	@Transactional
	public void endLive(User loginUser, Long liveSessionId) {
		// Artist만 허용
		if (loginUser.getRole() != UserRole.ARTIST) {
			throw new LiveSessionException(LiveSessionErrorCode.LIVE_SESSION_FORBIDDEN_NOT_ARTIST);
		}

		// 라이브세션 유효성 검증
		LiveSession session = liveSessionRepository.findById(liveSessionId)
			.orElseThrow(() -> new LiveSessionException(LiveSessionErrorCode.LIVE_SESSION_NOT_FOUND));

		// 아티스트 본인만 종료 가능
		if (!session.getArtistId().equals(loginUser.getId())) {
			throw new LiveSessionException(LiveSessionErrorCode.LIVE_SESSION_FORBIDDEN_NOT_OWNER);
		}

		// LIVE → ENDED; 이미 ENDED/RECORDED/READY/REJECTED/EXPIRED면 멱등 200 OK (이벤트 미발행)
		if (session.getStatus() != LiveSessionStatus.LIVE) {
			session.endNowIdempotent();
			return;
		}
		session.endNowIdempotent();
		session = liveSessionRepository.save(session);

		Instant endedAtInstant = session.getEndedAt() != null
			? session.getEndedAt()
			: Instant.now();
		eventPublisher.publishEvent(new LiveEndedEvent(liveSessionId, endedAtInstant));
	}

	/**
	 * 단건 조회. 채팅/Replay에서 liveSessionId(roomId)로 조회.
	 */
	@Transactional(readOnly = true)
	public LiveSessionResponse getLiveSession(Long id) {
		LiveSession session = liveSessionRepository.findById(id)
			.orElseThrow(() -> new LiveSessionException(LiveSessionErrorCode.LIVE_SESSION_NOT_FOUND));
		return toResponse(session);
	}

	/**
	 * 아티스트별 라이브 세션 목록 조회
	 * - status == null:
	 *   → status in (RECORDED, READY), expiresAt 미만료
	 * - status != null:
	 *   → status == 요청값, expiresAt 미만료
	 */
	@Transactional(readOnly = true)
	public List<LiveSessionCandidateResponse> getLiveSessionsByArtist(
		Long artistId,
		LiveSessionStatus status
	) {
		List<LiveSessionStatus> statuses =
			(status == null)
				? List.of(LiveSessionStatus.RECORDED, LiveSessionStatus.READY)
				: List.of(status);

		List<LiveSession> list =
			liveSessionRepository.findByArtistIdAndStatusInAndNotExpired(
				artistId,
				statuses,
				Instant.now()
			);

		User artist = userRepository.findById(artistId).orElse(null);
		String artistNickname = artist != null ? artist.getNickname() : "Unknown Artist";

		return list.stream()
			.map(s -> toCandidateResponse(s, artistNickname))
			.toList();
	}

	@Transactional(readOnly = true)
	public void validatePaidAccess(User loginUser,Long liveSessionId) {
		LiveSession session = liveSessionRepository.findById(liveSessionId)
			.orElseThrow(() -> new LiveSessionException(LiveSessionErrorCode.LIVE_SESSION_NOT_FOUND));

		// 유료가 아니면 통과
		if (!session.isPaid()) return;

		// 아티스트 본인/관리자는 통과
		if (loginUser.getRole() == UserRole.ARTIST && session.getArtistId().equals(loginUser.getId())) return;
		if (loginUser.getRole() == UserRole.ADMIN) return; // 있으면

		// 팬(일반 유저)은 구독 필요
		boolean subscribed = subscriptionRepository.existsActiveSubscriptionForArtist(
			loginUser.getId(),
			session.getArtistId(),
			Instant.now()
		);
		if (!subscribed) {
			throw new LiveSessionException(LiveSessionErrorCode.LIVE_SESSION_SUBSCRIPTION_REQUIRED);
		}
	}

	/**
	 * 라이브 시작 알림 (SSE 발송)
	 * - 유료 라이브: 구독자에게만
	 * - 무료 라이브: 팔로워 + 구독자 모두 (중복 제거)
	 */
	private void notifyLiveStarted(User artist, LiveSession session) {
		boolean isPaidLive = session != null && session.isPaid();

		Set<Long> targetUserIds = new LinkedHashSet<>();
		List<Long> subscriberUserIds = subscriptionRepository.findActiveSubscriberUserIdsByArtistId(
			session.getArtistId(),
			Instant.now()
		);
		if (subscriberUserIds != null) {
			for (Long id : subscriberUserIds) if (id != null) targetUserIds.add(id);
		}
		if (!isPaidLive) {
			List<Long> followerUserIds = followRepository.findFollowerUserIdsByArtistId(session.getArtistId());
			if (followerUserIds != null) {
				for (Long id : followerUserIds) if (id != null) targetUserIds.add(id);
			}
		}
		if (targetUserIds.isEmpty()) return;

		String title = session.getTitle();
		Long sessionId = session.getId();

		String shortTitle = (title != null && title.length() > 20) ? title.substring(0, 20) + "…" : title;

		for (Long fanId : targetUserIds) {
			NotificationSendRequest notificationRequest = NotificationSendRequest.builder()
				.senderId(artist.getId())
				.receiverId(fanId)
				.targetId(sessionId)
				.type(NotificationType.LIVE_STARTED)
				.content(artist.getNickname() + " 님이 라이브를 시작했어요!" + " <" + shortTitle + ">")
				.build();
			notificationService.sendNotification(notificationRequest);
		}
	}

	private LiveSessionCandidateResponse toCandidateResponse(LiveSession s, String artistNickname) {
		return LiveSessionCandidateResponse.builder()
			.id(s.getId())
			.artistId(s.getArtistId())
			.artistNickname(artistNickname)
			.title(s.getTitle())
			.isPaid(s.isPaid())
			.endedAt(s.getEndedAt())
			.expiresAt(s.getExpiresAt())
			.recordingS3Bucket(s.getRecordingS3Bucket())
			.recordingS3Prefix(s.getRecordingS3Prefix())
			.build();
	}

	private LiveSessionResponse toResponse(LiveSession s) {
		User artist = userRepository.findById(s.getArtistId()).orElse(null);
		String nickname = artist != null ? artist.getNickname() : "Unknown Artist";
		return LiveSessionResponse.builder()
			.id(s.getId())
			.artistId(s.getArtistId())
			.artistNickname(nickname)
			.channelArn(s.getChannelArn())
			.isPaid(s.isPaid())
			.title(s.getTitle())
			.status(s.getStatus())
			.startedAt(s.getStartedAt())
			.endedAt(s.getEndedAt())
			.recordingS3Bucket(s.getRecordingS3Bucket())
			.recordingS3Prefix(s.getRecordingS3Prefix())
			.expiresAt(s.getExpiresAt())
			.build();
	}
}
