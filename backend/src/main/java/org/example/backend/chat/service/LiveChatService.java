package org.example.backend.chat.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.example.backend.chat.dto.request.LiveChatMessageRequest;
import org.example.backend.chat.exception.ChatException;
import org.example.backend.chat.exception.LiveChatErrorCode;
import org.example.backend.live_session.exception.LiveSessionException;
import org.example.backend.live_session.service.LiveSessionService;
import org.example.backend.user.entity.User;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * 라이브 채팅 서비스
 * - DB 저장 없음
 * - Kafka(live-chat)로 발행만 수행
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LiveChatService {

	// LiveKafkaConfig에서 등록한 KafkaTemplate 빈을 주입
	private final KafkaTemplate<String, LiveChatMessageRequest> liveKafkaTemplate;

	private static final String TOPIC = "live-chat";
	private static final int MAX_CONTENT_LENGTH = 500;

	private final LiveSessionService liveSessionService;

	public void handleLiveMessage(User sender, LiveChatMessageRequest request) {
		validate(sender, request);

		LiveChatMessageRequest toSend = LiveChatMessageRequest.builder()
			.roomId(request.getRoomId())
			.senderId(sender.getId())
			.nickname(sender.getNickname())
			.content(request.getContent())
			.sentAt(LocalDateTime.now())
			.build();

		liveKafkaTemplate.send(TOPIC, String.valueOf(toSend.getRoomId()), toSend)
			.whenComplete((result, ex) -> {
				if (ex != null) {
					log.error("live-chat publish failed (roomId={}, senderId={})",
						toSend.getRoomId(), toSend.getSenderId(), ex);
				}
			});
	}

	private void validate(User sender, LiveChatMessageRequest req) {
		if (sender == null){
			throw new ChatException(LiveChatErrorCode.LIVE_CHAT_UNAUTHORIZED);
		}
		if (req == null) {
			throw new ChatException(LiveChatErrorCode.LIVE_CHAT_REQUEST_NULL);
		}
		if (req.getRoomId() == null) {
			throw new ChatException(LiveChatErrorCode.LIVE_CHAT_ROOM_ID_REQUIRED);
		}
		if (req.getContent() == null || req.getContent().isBlank()) {
			throw new ChatException(LiveChatErrorCode.LIVE_CHAT_CONTENT_REQUIRED);
		}
		if (req.getContent().length() > MAX_CONTENT_LENGTH) {
			throw new ChatException(LiveChatErrorCode.LIVE_CHAT_CONTENT_TOO_LONG);
		}
		// sender를 같이 넘겨서 유료 라이브 구독 검증까지 수행
		try {
			liveSessionService.validateChatAllowed(sender, req.getRoomId());
		} catch (LiveSessionException e) {
			throw new ChatException(LiveChatErrorCode.LIVE_CHAT_SESSION_INVALID);
		}
	}
}
