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
import org.example.backend.subscription.repository.SubscriptionRepository;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
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

		// LIVE → ENDED; 이미 ENDED/RECORDED/READY/REJECTED/EXPIRED면 멱등 200 OK
		if (session.getStatus() != LiveSessionStatus.LIVE) {
			session.endNowIdempotent();
			return;
		}
		session.endNowIdempotent();
		liveSessionRepository.save(session);
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
				OffsetDateTime.now()
			);

		return list.stream()
			.map(this::toCandidateResponse)
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
			LocalDateTime.now()
		);
		if (!subscribed) {
			throw new LiveSessionException(LiveSessionErrorCode.LIVE_SESSION_SUBSCRIPTION_REQUIRED);
		}
	}

	/**
	 * 라이브 시작 알림 (구독 팬들에게 SSE 발송)
	 * - receiverId: 구독 중인 팬 userId
	 * - senderId: 아티스트 userId
	 */
	private void notifyLiveStarted(User artist, LiveSession session) {
		List<Long> fanIds = subscriptionRepository.findActiveSubscriberUserIdsByArtistId(
			session.getArtistId(),
			LocalDateTime.now()
		);

		String title = session.getTitle();
		String shortTitle = (title != null && title.length() > 20) ? title.substring(0, 20) + "…" : title;

		for (Long fanId : fanIds) {
			NotificationSendRequest notificationRequest = NotificationSendRequest.builder()
				.senderId(artist.getId())
				.receiverId(fanId)
				.type(NotificationType.LIVE_STARTED)
				.content(artist.getNickname() + " 님이 라이브를 시작했어요!" + " <" + shortTitle + ">")
				.build();
			// DB 저장 + SSE 발송 (DM과 동일)
			notificationService.sendNotification(notificationRequest);
		}
	}

	private LiveSessionCandidateResponse toCandidateResponse(LiveSession s) {
		return LiveSessionCandidateResponse.builder()
			.id(s.getId())
			.artistId(s.getArtistId())
			.title(s.getTitle())
			.isPaid(s.isPaid())
			.endedAt(s.getEndedAt())
			.expiresAt(s.getExpiresAt())
			.recordingS3Bucket(s.getRecordingS3Bucket())
			.recordingS3Prefix(s.getRecordingS3Prefix())
			.build();
	}

	private LiveSessionResponse toResponse(LiveSession s) {
		return LiveSessionResponse.builder()
			.id(s.getId())
			.artistId(s.getArtistId())
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
