package org.example.backend.chat.service;

import org.example.backend.chat.dto.ChatMessageEvent;
import org.example.backend.chat.dto.ChatMessageRequest;
import org.example.backend.chat.entity.ChatMessage;
import org.example.backend.chat.entity.ChatRoom;
import org.example.backend.chat.enums.MessageType;
import org.example.backend.chat.repository.ChatMessageRepository;
import org.example.backend.chat.repository.ChatRoomRepository;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

/**
 * 채팅 서비스
 *
 * 책임:
 * - 채팅 메시지 처리(권한 타입 결정 → DB 저장 → Kafka 발행)
 *
 * 메시지 흐름:
 * 1) 발신자(User) 확인
 * 2) ChatRoom 조회
 * 3) 메시지 타입 결정(ARTIST/FAN)
 * 4) ChatMessage 저장
 * 5) ChatMessageEvent로 변환 후 Kafka 발행
 *
 * 참고:
 * - 구독/권한(ArtistSubscription) 체크는 추후 추가 예정
 */
@Service
@RequiredArgsConstructor
public class ChatService {

	private final ChatMessageRepository chatMessageRepository;
	private final KafkaTemplate<String, ChatMessageEvent> kafkaTemplate;

	private final ChatRoomRepository chatRoomRepository;
	private final UserRepository userRepository;

	/**
	 * 채팅 메시지 처리
	 *
	 * 주의:
	 * - request.senderId는 임시로 사용 중(테스트용)
	 * - 실제 운영에서는 WebSocket 세션/JWT(SecurityContext)에서 사용자 식별해야 함
	 */
	@Transactional
	public void handleMessage(ChatMessageRequest request) {

		// 1) 발신자 조회(현재는 senderId로 임시 조회)
		User sender = getCurrentUser(request.getSenderId());

		// 2) 채팅방 조회
		ChatRoom room = chatRoomRepository.findById(request.getRoomId())
			.orElseThrow(() -> new IllegalArgumentException("채팅방이 없습니다. id=" + request.getRoomId()));

		// 3) 메시지 타입 결정: 방 소유자면 ARTIST, 아니면 FAN
		MessageType type = room.getOwner().getId().equals(sender.getId())
			? MessageType.ARTIST
			: MessageType.FAN;

		// TODO: 구독/권한 체크(ArtistSubscription.isActive()) 추가

		// 4) 메시지 생성 및 저장
		ChatMessage message = ChatMessage.of(room, sender, type, request.getContent());
		ChatMessage saved = chatMessageRepository.save(message);

		// 5) Kafka 발행 (roomId를 key로 사용해 같은 방 메시지 파티션 정렬 유지)
		ChatMessageEvent event = ChatMessageEvent.from(saved);
		kafkaTemplate.send(
			"chat-room",
			room.getId().toString(),
			event
		);
	}

	/**
	 * 현재 로그인 사용자 조회
	 *
	 * 현재:
	 * - 테스트를 위해 request.senderId로 조회
	 *
	 * 추후:
	 * - WebSocket 세션 attribute 또는 SecurityContext 기반으로 교체
	 */
	private User getCurrentUser(Long senderId) {
		return userRepository.findById(senderId)
			.orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
	}
}
