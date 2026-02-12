package org.example.backend.ivs.exception;

import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

public enum IvsErrorCode implements ErrorCode {

    INVALID_TTL(HttpStatus.BAD_REQUEST, "INVALID_TTL", "ttlSeconds가 유효하지 않습니다."),
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "요청이 올바르지 않습니다."),
    INVALID_SESSION_STATE(HttpStatus.CONFLICT, "INVALID_SESSION_STATE", "LIVE 상태가 아닙니다."),
    FORBIDDEN_OPERATION(HttpStatus.FORBIDDEN, "FORBIDDEN_OPERATION", "작업을 수행할 권한이 없습니다."),
    SUBSCRIPTION_REQUIRED(HttpStatus.FORBIDDEN, "SUBSCRIPTION_REQUIRED", "구독이 필요합니다."),
    IVS_API_FAILED(HttpStatus.BAD_GATEWAY, "IVS_API_FAILED", "IVS 호출에 실패했습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;

    IvsErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }

    // HTTP 상태를 반환한다.
    @Override
    public HttpStatus getStatus() {
        return status;
    }

    // 에러 코드를 반환한다.
    @Override
    public String getCode() {
        return code;
    }

    // 에러 메시지를 반환한다.
    @Override
    public String getMessage() {
        return message;
    }
}
