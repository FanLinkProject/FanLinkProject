package org.example.backend.chat.entity;

import jakarta.persistence.*;
import lombok.*;

import org.example.backend.chat.enums.MessageType;
import org.example.backend.user.entity.User;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * 채널 메시지
 * - ARTIST: 모든 팬에게 보이는 메시지(브로드캐스트)
 * - FAN: 팬이 보낸 메시지(팬 화면에서는 '내 것만' 보이도록 조회 필터링)
 *
 * 주의:
 * - 팬 화면 조회 시 반드시
 *   (type=ARTIST) OR (type=FAN AND sender_id=me)
 *   로 필터링해야 함
 */
@Entity
@Table(name = "chat_messages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ChatMessage {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/**
	 * 소속 Room (아티스트 채널)
	 */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "room_id", nullable = false)
	private ChatRoom chatRoom;

	/**
	 * 발신자
	 * - ARTIST 메시지: sender == chatRoom.owner 여야 함(서비스에서 강제)
	 * - FAN 메시지: sender == 로그인 팬
	 */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "sender_id", nullable = false)
	private User sender;

	@Enumerated(EnumType.STRING)
	@Column(name = "message_type", nullable = false, length = 10)
	private MessageType messageType;

	@Column(name = "content", nullable = false, length = 5000)
	private String content;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	public static ChatMessage of(
		ChatRoom chatRoom,
		User sender,
		MessageType messageType,
		String content
	) {
		return ChatMessage.builder()
			.chatRoom(chatRoom)
			.sender(sender)
			.messageType(messageType)
			.content(content)
			.build();
	}
}
