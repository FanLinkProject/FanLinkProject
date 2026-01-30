package org.example.backend.chat.config;

import org.example.backend.chat.dto.response.ChatMessageResponse;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/**
 * Kafka 메시지 Consumer
 * 
 * 역할:
 * - Kafka에서 채팅 메시지를 수신하여 WebSocket으로 브로드캐스트
 * 
 * 요구사항 2 (라이브 채팅) 충족:
 * - Kafka → 서버 → WebSocket 브로드캐스트 부분 담당
 * 
	 * 메시지 흐름:
	 * 1. ChatService에서 DB 저장 후 Kafka로 발행 ("chat-room" 토픽)
	 * 2. 이 Consumer가 Kafka 메시지 수신 (ChatMessageEvent DTO로 역직렬화)
	 * 3. WebSocket으로 브로드캐스트 (/sub/chat/room/{roomId})
	 * 4. 구독 중인 클라이언트에게 실시간 전달
	 * 
	 * 그룹 ID: "chat-server"
	 * - 클러스터 환경에서 여러 인스턴스가 메시지를 분산 처리
	 * - 같은 그룹 내에서는 메시지가 한 번만 처리됨
 */
@Component
@RequiredArgsConstructor
public class ChatMessageConsumer {

	private final SimpMessageSendingOperations messagingTemplate;

	/**
	 * Kafka 메시지 수신 및 WebSocket 브로드캐스트
	 * 
	 * 동작:
	 * 1. Kafka에서 메시지 수신 (ChatMessageEvent DTO로 역직렬화)
	 * 2. /sub/chat/room/{roomId} 경로로 WebSocket 브로드캐스트
	 * 3. 해당 방을 구독한 모든 클라이언트에게 전달
	 * 
	 * 중요:
	 * - containerFactory = "kafkaListenerContainerFactory" 지정 필수
	 * - 이렇게 해야 JsonDeserializer를 사용하는 전용 컨테이너를 사용
	 * - 지정하지 않으면 기본 StringDeserializer 컨테이너를 사용하여 에러 발생
	 * 
	 * 토픽:
	 * - "chat-room" (단일 토픽 사용)
	 * - ChatService에서 동일 토픽으로 발행
	 */
	/*@KafkaListener(
		topics = "chat-room",
		groupId = "chat-server",
		containerFactory = "kafkaListenerContainerFactory"
	)
	public void consume(ChatMessageResponse event) {
		// ✅ WebSocket 브로드캐스트도 DTO로 (엔티티 X)
		messagingTemplate.convertAndSend(
			"/sub/chat/room/" + event.getRoomId(),
			event
		);
	}*/
    /** 팬 → 아티스트 */
    @KafkaListener(
            topics = "artist-channel",
            groupId = "chat-server",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void consumeFanToArtist(ChatMessageResponse event) {
        messagingTemplate.convertAndSend(
                "/sub/chat/artist/" + event.getRoomId(),
                event
        );
    }

    /** 아티스트 → 팬 */
    @KafkaListener(
            topics = "fan-channel",
            groupId = "chat-server",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void consumeArtistToFan(ChatMessageResponse event) {
        messagingTemplate.convertAndSend(
                "/sub/chat/fan/" + event.getRoomId(),
                event
        );
    }
}