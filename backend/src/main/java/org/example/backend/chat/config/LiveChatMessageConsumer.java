package org.example.backend.chat.config;

import lombok.RequiredArgsConstructor;
import org.example.backend.chat.dto.request.LiveChatMessageRequest;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Component;

/**
 * Live Chat Kafka Consumer
 *
 * 역할:
 * - Kafka(live-chat)에서 라이브 채팅 메시지를 수신
 * - WebSocket으로 브로드캐스트 (/sub/live/{roomId})
 */
@Component
@RequiredArgsConstructor
public class LiveChatMessageConsumer {

	private final SimpMessageSendingOperations messagingTemplate;

	@KafkaListener(
		topics = "live-chat",
		groupId = "live-chat-server",
		containerFactory = "liveKafkaListenerContainerFactory"
	)
	public void consume(LiveChatMessageRequest event) {
		if (event == null || event.getRoomId() == null) {
			return;
		}
		messagingTemplate.convertAndSend(
			"/sub/live/" + event.getRoomId(),
			event
		);
	}
}
