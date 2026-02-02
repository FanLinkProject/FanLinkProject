package org.example.backend.chat.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.global.security.jwt.JwtTokenProvider;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class StompAuthInterceptor implements ChannelInterceptor {

	private static final String AUTHORIZATION = "Authorization";
	private static final String BEARER = "Bearer ";

	private final JwtTokenProvider jwtTokenProvider;

	@Override
	public Message<?> preSend(Message<?> message, MessageChannel channel) {
		StompHeaderAccessor accessor =
			MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

		if (accessor == null) return message;

		StompCommand cmd = accessor.getCommand();
		if (cmd == null) return message;

		// CONNECT에서만 잡아도 되고, SEND/SUBSCRIBE까지 강제하고 싶으면 추가
		if (StompCommand.CONNECT.equals(cmd)) {
			String header = accessor.getFirstNativeHeader(AUTHORIZATION);
			if (header == null || !header.startsWith(BEARER)) {
				// 여기서 ChatException 던지고 싶으면 던져도 됨 (다만 STOMP 에러 프레임 처리 필요)
				throw new IllegalArgumentException("Missing Authorization Bearer token");
			}

			String token = header.substring(BEARER.length());

			if (!jwtTokenProvider.validateToken(token)) {
				throw new IllegalArgumentException("Invalid or expired token");
			}

			Authentication auth = jwtTokenProvider.getAuthentication(token);

			// 이후 @MessageMapping에서 Principal로 들어옴
			accessor.setUser(auth);
		}

		return message;
	}
}
