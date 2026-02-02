package org.example.backend.chat.dto.response;

import java.time.LocalDateTime;

import org.example.backend.chat.entity.ChatMessage;
import org.example.backend.chat.enums.MessageType;

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
	private LocalDateTime createdAt;

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