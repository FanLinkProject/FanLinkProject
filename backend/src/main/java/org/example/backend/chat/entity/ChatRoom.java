package org.example.backend.chat.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.backend.user.entity.User;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 아티스트 채널용 채팅방
 * - 아티스트당 1개의 Room만 존재 (팬들은 이 Room을 1:1 대화처럼 봄)
 * - 참여자(ChatRoomMember)는 저장하지 않음 (구독/권한은 별도 로직에서 처리)
 */
@Entity
@Table(
	name = "chat_rooms",
	uniqueConstraints = {
		// 아티스트(소유자)당 방 1개
		@UniqueConstraint(name = "uk_chat_room_owner", columnNames = {"user_id"})
	}
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ChatRoom {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/**
	 * 이 방의 소유자(아티스트 User)
	 * - 아티스트는 이 room에 ARTIST 메시지만 발송 가능하도록 서비스에서 강제
	 */
	@OneToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id", nullable = false)
	private User owner;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;
}