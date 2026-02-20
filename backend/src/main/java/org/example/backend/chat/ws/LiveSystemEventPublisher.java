package org.example.backend.chat.ws;

import lombok.RequiredArgsConstructor;
import org.example.backend.live_session.event.LiveEndedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * 라이브 시스템 이벤트를 STOMP로 전송하는 전용 컴포넌트.
 * LiveSessionService와 WebSocket 설정 간 순환참조를 피하기 위해
 * ApplicationEvent 수신 후 여기서만 convertAndSend 수행.
 */
@Component
@RequiredArgsConstructor
public class LiveSystemEventPublisher {

	private static final String TYPE_SYSTEM = "SYSTEM";
	private static final String EVENT_LIVE_ENDED = "LIVE_ENDED";
	private static final String EVENT_LIVE_LIST_CHANGED = "LIVE_LIST_CHANGED";

	private final SimpMessageSendingOperations messagingTemplate;

	@EventListener
	public void onLiveEnded(LiveEndedEvent event) {
		Long id = event.liveSessionId();
		String endedAtIso = event.endedAt().toString();

		// 1) 해당 라이브 구독자에게 LIVE_ENDED 전송
		messagingTemplate.convertAndSend("/sub/live/" + id, Map.of(
			"type", TYPE_SYSTEM,
			"event", EVENT_LIVE_ENDED,
			"liveSessionId", id,
			"endedAt", endedAtIso
		));

		// 2) global 구독자에게 LIVE_LIST_CHANGED 전송
		messagingTemplate.convertAndSend("/sub/live/global", Map.of(
			"type", TYPE_SYSTEM,
			"event", EVENT_LIVE_LIST_CHANGED,
			"liveSessionId", id
		));
	}
}
