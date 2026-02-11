package org.example.backend.like.exception;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

@RequiredArgsConstructor
public enum LikeErrorCode implements ErrorCode {
    TARGET_NOT_FOUND(HttpStatus.NOT_FOUND, "LIKE_TARGET_NOT_FOUND",
            "좋아요 대상을 찾을 수 없거나 삭제되었습니다."),

    INVALID_TARGET_TYPE(HttpStatus.BAD_REQUEST, "INVALID_TARGET_TYPE",
            "지원하지 않는 좋아요 대상 타입입니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;

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
