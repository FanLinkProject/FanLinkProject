package org.example.backend.chat.dto.request;




import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * WebSocket STOMP를 통해 수신하는 채팅 메시지 요청 DTO
 * 
 * 메시지 흐름:
 * 클라이언트 → /pub/chat/send → ChatWebSocketController → ChatService
 * 
 * 주의:
 * - senderId는 클라이언트에서 전송되지만, 서버에서 실제 로그인 사용자와 일치하는지 검증 필요
 * - ChatService.getCurrentUser()로 실제 발신자 확인 후 사용
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageRequest {
	/**
	 * 채팅방 식별자 (ChatRoom.id)
	 * - 아티스트당 1개의 Room 존재
	 * - 팬은 이 Room에 접근하여 1:1 대화처럼 보이게 함
	 */
	// @NotNull
	private Long roomId;

	/**
	 * 메시지 발신자 ID (User.id)
	 * 
	 * 주의:
	 * - 클라이언트에서 전송되지만, 서버에서 실제 로그인 사용자와 일치 검증 필수
	 * - ChatService에서 getCurrentUser()로 실제 발신자 확인 후 사용
	 * - MessageType 결정: room.owner.id == sender.id ? ARTIST : FAN
	 */
	// @NotNull
	private Long senderId;

	/**
	 * 메시지 내용
	 * - 최대 길이: 5000자 (ChatMessage.content @Lob 제약)
	 */
	// @NotNull
	private String content;

}
