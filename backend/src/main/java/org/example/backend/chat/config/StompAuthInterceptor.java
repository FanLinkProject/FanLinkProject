package org.example.backend.chat.config;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.example.backend.chat.service.LiveChatService;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.global.security.jwt.JwtTokenProvider;
import org.example.backend.live_session.service.LiveSessionService;
import org.example.backend.user.entity.User;
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

	// 라이브 구독 destination 패턴: /sub/live/{roomId}
	private static final Pattern LIVE_SUB_DEST_PATTERN = Pattern.compile("^/sub/live/(\\d+)$");
	private final LiveChatService liveChatService;


	private static final String LIVE_SEND_DEST = "/pub/live/send";
	private static final String LIVE_AUTH_PREFIX = "LIVE_AUTH:";
	private String liveAuthKey(Long roomId) { return LIVE_AUTH_PREFIX + roomId; }

	@Override
	public Message<?> preSend(Message<?> message, MessageChannel channel) {
		StompHeaderAccessor accessor =
			MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

		if (accessor == null) return message;

		StompCommand cmd = accessor.getCommand();
		if (cmd == null) return message;

		if (StompCommand.CONNECT.equals(cmd)) {
			String header = accessor.getFirstNativeHeader(AUTHORIZATION);
			if (header == null || !header.startsWith(BEARER)) {
				throw new IllegalArgumentException("Missing Authorization Bearer token");
			}

			String token = header.substring(BEARER.length());
			if (!jwtTokenProvider.validateToken(token)) {
				throw new IllegalArgumentException("Invalid or expired token");
			}

			Authentication auth = jwtTokenProvider.getAuthentication(token);
			accessor.setUser(auth);
			return message;
		}

		if (StompCommand.SUBSCRIBE.equals(cmd)) {
			String destination = accessor.getDestination();
			Long roomId = extractLiveRoomId(destination);

			if (roomId == null) return message;

			if (accessor.getSessionAttributes() == null) {
				throw new IllegalArgumentException("STOMP session not established");
			}

			User loginUser = extractLoginUser(accessor);
			liveChatService.validateChatAllowed(loginUser, roomId);

			accessor.getSessionAttributes().put(liveAuthKey(roomId), true);

			return message;
		}

		if (StompCommand.SEND.equals(cmd)) {
			String destination = accessor.getDestination();
			if (!LIVE_SEND_DEST.equals(destination)) return message;

			if (accessor.getSessionAttributes() == null) {
				throw new IllegalArgumentException("STOMP session not established");
			}

			String roomIdHeader = accessor.getFirstNativeHeader("roomId");
			if (roomIdHeader == null) {
				throw new IllegalArgumentException("Missing roomId header");
			}

			Long roomId;
			try {
				roomId = Long.parseLong(roomIdHeader);
			} catch (NumberFormatException e) {
				throw new IllegalArgumentException("Invalid roomId header");
			}

			Boolean ok = (Boolean) accessor.getSessionAttributes().get(liveAuthKey(roomId));
			if (ok == null || !ok) {
				throw new IllegalArgumentException("Not authorized for this live room");
			}

			return message;
		}

		return message;
	}
	private Long extractLiveRoomId(String destination) {
		if (destination == null) return null;
		Matcher matcher = LIVE_SUB_DEST_PATTERN.matcher(destination);
		if (!matcher.matches()) return null;
		return Long.parseLong(matcher.group(1));
	}

	private User extractLoginUser(StompHeaderAccessor accessor) {
		if (accessor.getUser() == null) {
			throw new IllegalArgumentException("Unauthenticated STOMP session (no Principal)");
		}
		if (!(accessor.getUser() instanceof Authentication authentication)) {
			throw new IllegalArgumentException("Invalid STOMP Principal type");
		}

		Object principal = authentication.getPrincipal();
		if (!(principal instanceof PrincipalDetails principalDetails)) {
			throw new IllegalArgumentException("Invalid PrincipalDetails in STOMP Principal");
		}
		return principalDetails.getUser();
	}
}
