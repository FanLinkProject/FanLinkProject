package org.example.backend.chat.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import lombok.RequiredArgsConstructor;

/**
 * WebSocket STOMP 설정
 * 
 * 역할:
 * - STOMP 프로토콜 기반 WebSocket 메시징 활성화
 * - 메시지 브로커 설정 (SimpleBroker 사용)
 * 
 * 요구사항 2 (라이브 채팅) 충족:
 * - WebSocket(STOMP) <-> 서버 <-> Kafka <-> 서버 <-> WebSocket 브로드캐스트
 * - 이 설정은 WebSocket 부분 담당
 * 
 * 주의사항:
 * - 인증/권한 처리는 별도 Interceptor 필요 (현재 미구현)
 * - StompAuthInterceptor 또는 ChannelInterceptor로 CONNECT 시 토큰 검증 필요
 * - setAllowedOrigins("*")는 프로덕션에서는 특정 도메인으로 제한 필요
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

	private final StompAuthInterceptor stompAuthInterceptor;

	@Override
	public void configureClientInboundChannel(ChannelRegistration registration) {
		registration.interceptors(stompAuthInterceptor);
	}
	/**
	 * STOMP 엔드포인트 등록
	 * 
	 * 클라이언트 연결:
	 *   ws://host/ws-chat
	 * 
	 * 인증 흐름 (구현 필요):
	 * - CONNECT 프레임에서 토큰 전달 (헤더 또는 쿼리 파라미터)
	 * - ChannelInterceptor에서 토큰 검증 및 User 정보 세션 저장
	 * - 이후 메시지 전송 시 세션에서 User 정보 추출
	 * 
	 * 주의:
	 * - setAllowedOrigins("*")는 개발 환경용, 프로덕션에서는 특정 도메인으로 제한
	 */
	@Override
	public void registerStompEndpoints(StompEndpointRegistry registry) {
		registry.addEndpoint("/ws-chat")
			.setAllowedOrigins("*");// CORS 허용
	}

	/**
	 * 메시지 브로커 설정
	 *
	 * 메시지 흐름:
	 *
	 * 1) 클라이언트 → 서버 (메시지 전송)
	 *    클라이언트: /pub/chat/send 로 메시지 전송
	 *    → @MessageMapping("/chat/send") 이 처리 (ChatWebSocketController)
	 *    → ChatService.handleMessage() 호출
	 *    → DB 저장 + Kafka 발행
	 *
	 * 2) 서버 → 클라이언트 (메시지 브로드캐스트)
	 *    서버: /sub/chat/room/{roomId} 로 메시지 발행
	 *    → 구독 중인 클라이언트에게 브로드캐스트
	 *    → ChatMessageConsumer에서 Kafka 메시지 수신 후 이 경로로 발행
	 * 
	 * 구독 경로 예시:
	 * - 팬/아티스트: /sub/chat/room/{roomId} 구독
	 * - 클라이언트에서 STOMP subscribe("/sub/chat/room/1") 호출
	 */
	@Override
	public void configureMessageBroker(MessageBrokerRegistry registry) {
		// SimpleBroker: 인메모리 브로커 (단일 서버 환경용)
		// 클러스터 환경에서는 RabbitMQ/Redis 등 외부 브로커 필요
		registry.enableSimpleBroker("/sub");
		
		// 클라이언트 → 서버 메시지 경로 prefix
		registry.setApplicationDestinationPrefixes("/pub");
	}
}