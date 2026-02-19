package org.example.backend.chat.dto.response;

import java.time.Instant;

import org.example.backend.chat.entity.ChatMessage;
import org.example.backend.chat.enums.MessageType;

/**
 * 채팅 메시지 응답 DTO.
 * 시간 필드(createdAt)는 Instant(ISO-8601 UTC)로 노출되며, 프론트엔드에서 브라우저 timezone으로 현지화.
 */

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Builder
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageResponse {

	private Long messageId;
	private Long roomId;
	private Long senderId;
    private String senderNickName;
	private MessageType type;
	private String content;
	/** ISO-8601 UTC. 프론트엔드에서 브라우저 timezone으로 현지화. */
	private Instant createdAt;

	public static ChatMessageResponse from(ChatMessage message) {
		return ChatMessageResponse.builder()
			.messageId(message.getId())
			.roomId(message.getChatRoom().getId())
			.senderId(message.getSender().getId())
            .senderNickName(message.getSender().getNickname())
			.type(message.getMessageType())
			.content(message.getContent())
			.createdAt(message.getCreatedAt())
			.build();
	}
}