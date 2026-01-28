package org.example.backend.post.exception;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

@RequiredArgsConstructor
public enum PostErrorCode implements ErrorCode {

    POST_NOT_FOUND(HttpStatus.NOT_FOUND, "POST_NOT_FOUND", "존재하지 않는 게시글입니다."),
    NOT_POST_WRITER(HttpStatus.FORBIDDEN, "NOT_POST_WRITER", "게시글 수정/삭제 권한이 없습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;

    @Override public HttpStatus getStatus() { return status; }
    @Override public String getCode() { return code; }
    @Override public String getMessage() { return message; }
}