package org.example.backend.live_session.exception;

import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

/**
 * LiveSession 도메인 전용 에러 코드.
 * (code, httpStatus, message) 형태.
 */
public enum LiveSessionErrorCode implements ErrorCode {

	LIVE_SESSION_FORBIDDEN_NOT_ARTIST(HttpStatus.FORBIDDEN, "LIVE_SESSION_FORBIDDEN_NOT_ARTIST", "ARTIST 권한이 필요합니다."),
	LIVE_SESSION_NOT_FOUND(HttpStatus.NOT_FOUND, "LIVE_SESSION_NOT_FOUND", "라이브 세션을 찾을 수 없습니다."),
	LIVE_SESSION_FORBIDDEN_NOT_OWNER(HttpStatus.FORBIDDEN, "LIVE_SESSION_FORBIDDEN_NOT_OWNER", "해당 세션의 소유자가 아닙니다."),

	LIVE_SESSION_NOT_LIVE(HttpStatus.BAD_REQUEST, "LIVE_SESSION_NOT_LIVE", "현재 LIVE 상태가 아닌 라이브 세션입니다."),
	LIVE_SESSION_SUBSCRIPTION_REQUIRED(HttpStatus.FORBIDDEN,"LIVE_SESSION_SUBSCRIPTION_REQUIRED", "유료 라이브는 구독자만 이용할 수 있습니다."),

	;

	private final HttpStatus status;
	private final String code;
	private final String message;

	LiveSessionErrorCode(HttpStatus status, String code, String message) {
		this.status = status;
		this.code = code;
		this.message = message;
	}

	@Override
	public HttpStatus getStatus() {
		return status;
	}

	@Override
	public String getCode() {
		return code;
	}

	@Override
	public String getMessage() {
		return message;
	}
}
