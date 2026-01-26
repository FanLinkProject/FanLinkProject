package org.example.backend.chat.controller;

import org.example.backend.chat.dto.ChatMessageRequest;
import org.example.backend.chat.service.ChatService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

import lombok.RequiredArgsConstructor;

/**
 * WebSocket STOMP 메시지 컨트롤러
 * 
 * 역할:
 * - 클라이언트로부터 WebSocket 메시지를 수신하여 ChatService로 전달
 * 
 * 메시지 흐름:
 * 클라이언트 → /pub/chat/send → 이 컨트롤러 → ChatService
 * 
 * 요구사항 2 (라이브 채팅) 충족:
 * - WebSocket(STOMP) → 서버 부분 담당
 * 
 * 인증/권한:
 * - 현재 명시적인 인증 처리 없음
 * - ChannelInterceptor 또는 StompAuthInterceptor 추가 필요
 * - CONNECT 시 토큰 검증 및 User 정보 세션 저장 필요
 * - ChatService.getCurrentUser()에서 세션의 User 정보 사용
 */
@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {

	private final ChatService chatService;

	/**
	 * 채팅 메시지 수신 및 처리
	 * 
	 * STOMP 메시지 매핑:
	 * - 클라이언트에서 /pub/chat/send로 메시지 전송
	 * - 이 메서드가 자동 호출됨
	 * 
	 * @param request ChatMessageRequest (roomId, senderId, content)
	 * 
	 * 처리 흐름:
	 * 1. ChatService.handleMessage() 호출
	 * 2. DB 저장 + Kafka 발행
	 * 3. ChatMessageConsumer가 Kafka 메시지 수신 후 WebSocket 브로드캐스트
	 * 
	 * 주의:
	 * - senderId는 클라이언트에서 전송되지만, 서버에서 실제 로그인 사용자와 일치 검증 필요
	 * - ChatService에서 getCurrentUser()로 실제 발신자 확인
	 */
	@MessageMapping("/chat/send")
	public void send(ChatMessageRequest request) {
		chatService.handleMessage(request);
	}
}