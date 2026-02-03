package org.example.backend.chat.exception;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

@RequiredArgsConstructor
public enum DMChatErrorCode implements ErrorCode {

    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "사용자를 찾을 수 없습니다."),
    CHATROOM_NOT_FOUND(HttpStatus.NOT_FOUND, "CHATROOM_NOT_FOUND", "채팅방을 찾을 수 없습니다."),
    HOST_CANNOT_BE_ARTIST(HttpStatus.BAD_REQUEST, "HOST_CANNOT_BE_ARTIST", "호스트는 아티스트일 수 없습니다."),
	CHAT_ROOM_NOT_FOUND(HttpStatus.NOT_FOUND, "CHAT_ROOM_NOT_FOUND", "해당 아티스트의 DM 채팅방을 찾을 수 없습니다."),
	CHAT_ROOM_MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "CHAT_ROOM_MEMBER_NOT_FOUND", "해당 DM 채팅방의 멤버를 찾을 수 없습니다."),

	;

    private final HttpStatus status;
    private final String code;
    private final String message;

    @Override public HttpStatus getStatus() { return status; }
    @Override public String getCode() { return code; }
    @Override public String getMessage() { return message; }
}