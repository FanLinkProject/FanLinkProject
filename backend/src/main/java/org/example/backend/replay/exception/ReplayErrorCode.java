package org.example.backend.replay.exception;

import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

public enum ReplayErrorCode implements ErrorCode {

    DUPLICATE_PUBLISH(HttpStatus.CONFLICT, "DUPLICATE_PUBLISH", "이미 발행된 다시보기입니다."),
    REPLAY_NOT_FOUND(HttpStatus.NOT_FOUND, "REPLAY_NOT_FOUND", "다시보기를 찾을 수 없습니다."),
    INVALID_SESSION_STATE(HttpStatus.CONFLICT, "INVALID_SESSION_STATE", "라이브 세션 상태가 유효하지 않습니다."),
    RECORDING_NOT_READY(HttpStatus.CONFLICT, "RECORDING_NOT_READY", "녹화본이 아직 준비되지 않았습니다."),
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "요청 값이 올바르지 않습니다."),
    FORBIDDEN_OPERATION(HttpStatus.FORBIDDEN, "FORBIDDEN_OPERATION", "작업을 수행할 권한이 없습니다."),
    SUBSCRIPTION_REQUIRED(HttpStatus.FORBIDDEN, "SUBSCRIPTION_REQUIRED", "구독이 필요합니다."),
    COOKIE_ISSUE_FAILED(HttpStatus.BAD_GATEWAY, "COOKIE_ISSUE_FAILED", "재생 쿠키 발급에 실패했습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;

    // Replay 에러 코드를 생성한다.
    ReplayErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }

    @Override
    // HTTP 상태를 반환한다.
    public HttpStatus getStatus() {
        return status;
    }

    @Override
    // 에러 코드를 반환한다.
    public String getCode() {
        return code;
    }

    @Override
    // 에러 메시지를 반환한다.
    public String getMessage() {
        return message;
    }
}
