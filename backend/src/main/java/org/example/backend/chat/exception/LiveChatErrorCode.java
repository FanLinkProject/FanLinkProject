package org.example.backend.chat.exception;

import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public enum LiveChatErrorCode implements ErrorCode {

	USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "사용자를 찾을 수 없습니다."),

	LIVE_CHAT_UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "LIVE_CHAT_UNAUTHORIZED", "인증이 필요합니다."),
	LIVE_CHAT_REQUEST_NULL(HttpStatus.BAD_REQUEST, "LIVE_CHAT_REQUEST_NULL", "라이브 채팅 요청이 비어있습니다."),
	LIVE_CHAT_ROOM_ID_REQUIRED(HttpStatus.BAD_REQUEST, "LIVE_CHAT_ROOM_ID_REQUIRED", "roomId(liveId)는 필수입니다."),
	LIVE_CHAT_SENDER_ID_REQUIRED(HttpStatus.BAD_REQUEST, "LIVE_CHAT_SENDER_ID_REQUIRED", "senderId는 필수입니다."),
	LIVE_CHAT_CONTENT_REQUIRED(HttpStatus.BAD_REQUEST, "LIVE_CHAT_CONTENT_REQUIRED", "메시지 내용은 필수입니다."),
	LIVE_CHAT_CONTENT_TOO_LONG(HttpStatus.BAD_REQUEST, "LIVE_CHAT_CONTENT_TOO_LONG", "메시지 길이가 너무 깁니다."),

	SUBSCRIPTION_REQUIRED(HttpStatus.FORBIDDEN, "SUBSCRIPTION_REQUIRED", "구독자만 이용할 수 있는 라이브 채팅입니다."),
	SUBSCRIPTION_EXPIRED(HttpStatus.FORBIDDEN, "SUBSCRIPTION_EXPIRED", "구독이 만료되어 라이브 채팅에 참여할 수 없습니다."),
	LIVE_CHAT_ARTIST_ID_REQUIRED(HttpStatus.BAD_REQUEST, "LIVE_CHAT_ARTIST_ID_REQUIRED", "artistId는 필수입니다."),

	LIVE_CHAT_SESSION_INVALID(HttpStatus.BAD_REQUEST, "LIVE_CHAT_SESSION_INVALID", "유효하지 않거나 채팅할 수 없는 라이브 세션입니다."),

	;
	private final HttpStatus status;
	private final String code;
	private final String message;

	@Override public HttpStatus getStatus() {return status;}
	@Override public String getCode() {return code;}
	@Override public String getMessage() {return message;}
}
