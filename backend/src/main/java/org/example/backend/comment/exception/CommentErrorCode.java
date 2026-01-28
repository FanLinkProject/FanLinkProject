package org.example.backend.comment.exception;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

@RequiredArgsConstructor
public enum CommentErrorCode implements ErrorCode {

    COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "COMMENT_NOT_FOUND", "존재하지 않는 댓글입니다."),
    PARENT_COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "PARENT_NOT_FOUND", "부모 댓글을 찾을 수 없습니다."),
    NOT_COMMENT_WRITER(HttpStatus.FORBIDDEN, "NOT_COMMENT_WRITER", "댓글 수정/삭제 권한이 없습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;

    @Override public HttpStatus getStatus() { return status; }
    @Override public String getCode() { return code; }
    @Override public String getMessage() { return message; }
}