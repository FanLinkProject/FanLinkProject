package org.example.backend.notification.exception;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

@RequiredArgsConstructor
public enum NotificationErrorCode implements ErrorCode {

	// ===== User / 권한 =====
	RECEIVER_NOT_FOUND(HttpStatus.NOT_FOUND, "NOTIFICATION_RECEIVER_NOT_FOUND", "수신자를 찾을 수 없습니다."),
	SENDER_NOT_FOUND(HttpStatus.NOT_FOUND, "NOTIFICATION_SENDER_NOT_FOUND", "발신자를 찾을 수 없습니다."),

	// ===== Notification =====
	NOTIFICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "NOTIFICATION_NOT_FOUND", "존재하지 않는 알림입니다."),

	;

	private final HttpStatus status;
	private final String code;
	private final String message;

	@Override public HttpStatus getStatus() { return status; }
	@Override public String getCode() { return code; }
	@Override public String getMessage() { return message; }
}
