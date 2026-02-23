package org.example.backend.chat.controller;

import java.security.Principal;

import org.example.backend.chat.dto.request.ChatMessageRequest;
import org.example.backend.chat.service.ChatService;
import org.example.backend.global.security.details.PrincipalDetails;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
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
	 * 1. ChatService 호출
	 * 2. DB 저장 + Kafka 발행
	 * 3. ChatMessageConsumer가 Kafka 메시지 수신 후 WebSocket 브로드캐스트
	 */
	/*@MessageMapping("/chat/send")
	public void send(@Payload ChatMessageRequest request, Principal principal) {
		PrincipalDetails loginUser = (PrincipalDetails) ((org.springframework.security.core.Authentication) principal).getPrincipal();
		chatService.handleMessage(loginUser.getUser(), request);
	}*/

    @MessageMapping("/chat/send/fan")
    public void sendFanMessage(ChatMessageRequest request, Principal principal) {
        PrincipalDetails loginUser = (PrincipalDetails) ((org.springframework.security.core.Authentication) principal).getPrincipal();
        chatService.sendToArtist(loginUser.getUser(), request);// Kafka → artist-channel
    }

    @MessageMapping("/chat/send/artist")
    public void sendArtistMessage(ChatMessageRequest request, Principal principal) {
        PrincipalDetails loginUser = (PrincipalDetails) ((org.springframework.security.core.Authentication) principal).getPrincipal();
        chatService.sendToFans(loginUser.getUser(), request);     // Kafka → fan-channel
    }

}