package org.example.backend.chat.controller;

import java.security.Principal;

import lombok.RequiredArgsConstructor;
import org.example.backend.chat.dto.request.LiveChatMessageRequest;
import org.example.backend.chat.service.LiveChatService;
import org.example.backend.global.security.details.PrincipalDetails;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

/**
 * 라이브 채팅 WebSocket(STOMP) 컨트롤러
 *
 * 메시지 흐름:
 * 클라이언트 → /pub/live/send → 이 컨트롤러 → LiveChatService → Kafka(live-chat) 발행
 * → LiveChatMessageConsumer가 수신 → /sub/live/{roomId} 브로드캐스트
 */
@Controller
@RequiredArgsConstructor
public class LiveChatWebSocketController {

	private final LiveChatService liveChatService;

	/**
	 * STOMP 매핑:
	 * - 클라이언트에서 /pub/live/send 로 메시지 전송
	 *
	 * 주의:
	 * - senderId/nickname 위변조 방지(=실제 로그인 유저 검증)는 interceptor/세션 기반으로 붙이는 걸 권장
	 * - 현재는 DTO를 그대로 Kafka로 전달
	 */
	@MessageMapping("/live/send")
	public void send(@Payload LiveChatMessageRequest request, Principal principal) {
		PrincipalDetails loginUser = (PrincipalDetails) ((org.springframework.security.core.Authentication) principal).getPrincipal();
		liveChatService.handleLiveMessage(loginUser.getUser(), request);
	}
}
