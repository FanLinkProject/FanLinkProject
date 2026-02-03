package org.example.backend.chat.entity;

import java.time.LocalDateTime;

import org.example.backend.user.entity.User;
import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 채팅방 멤버 엔티티
 * 
 * 역할:
 * - 채팅방 참여자 정보 저장 (선택적 사용)
 * 
 * 현재 설계:
 * - ChatRoom 주석에 "참여자(ChatRoomMember)는 저장하지 않음" 명시
 * - 실제 권한/구독 관리는 ArtistSubscription 엔티티로 처리
 * - 이 엔티티는 향후 확장용 또는 다른 용도로 보임
 * 
 * 주의:
 * - 현재 서비스 로직에서 사용되지 않는 것으로 보임
 * - 필요 시 ChatService에서 참여자 관리 로직 추가 필요
 */
@Entity
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatRoomMember {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/**
	 * 참여자 (User 엔티티)
	 * - Member가 아닌 User 기준으로 처리 (요구사항 5)
	 */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id")
	private User user;

	/**
	 * 소속 채팅방 (ChatRoom)
	 */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "room_id")
	private ChatRoom chatRoom;

	/**
	 * 채팅방 입장 시각
	 * - 참고: 요구사항 3에 따르면 입장/퇴장 표시 메시지는 불필요
	 * - 이 필드는 히스토리/통계 목적일 수 있음
	 */
	@CreationTimestamp
	@Column(name = "joined_at", nullable = false, updatable = false)
	private LocalDateTime joinedAt;

}
