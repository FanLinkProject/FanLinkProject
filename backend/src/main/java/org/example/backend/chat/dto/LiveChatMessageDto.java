package org.example.backend.chat.dto;

import lombok.*;

import java.time.LocalDateTime;

/**
 * 라이브 채팅 메시지 DTO
 * 
 * 역할:
 * - DB 저장 없이 WebSocket / Kafka로만 전달되는 실시간 메시지용 DTO
 * - ChatMessage 엔티티와 달리 영속화되지 않음
 * 
 * 사용 시나리오:
 * - 라이브 방송 중 채팅 (라이브 송출은 다른 팀 담당)
 * - 실시간 브로드캐스트만 필요하고 히스토리 저장이 불필요한 경우
 * 
 * 주의:
 * - 현재 코드에서는 ChatMessage 엔티티를 직접 Kafka로 전송하고 있음
 * - 이 DTO는 향후 확장용으로 보임 (현재 미사용 가능성)
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveChatMessageDto {

	/**
	 * 라이브 채팅방 식별자 (ChatRoom.id 또는 별도 liveId)
	 */
	private Long roomId;

	/**
	 * 메시지 발신자 ID (User.id)
	 */
	private Long senderId;

	/**
	 * 발신자 닉네임
	 * - 실시간 표시용 (User 엔티티 조회 최소화 목적)
	 * - 클라이언트에서 즉시 표시 가능하도록 포함
	 */
	private String nickname;

	/**
	 * 메시지 내용
	 */
	private String content;

	/**
	 * 메시지 전송 시각
	 * - 서버 기준 (LocalDateTime.now())
	 * - 클라이언트 시간 동기화용
	 */
	private LocalDateTime sentAt;
}
