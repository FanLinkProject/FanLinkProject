package org.example.backend.comment.exception;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

@RequiredArgsConstructor
public enum CommentErrorCode implements ErrorCode {
    COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "COMMENT_NOT_FOUND", "댓글을 찾을 수 없습니다."),
    PARENT_COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "PARENT_COMMENT_NOT_FOUND", "부모 댓글이 존재하지 않거나 삭제되었습니다."),
    REPLY_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "REPLY_NOT_ALLOWED", "대댓글에는 답글을 달 수 없습니다."),
    UNAUTHORIZED_ACCESS(HttpStatus.FORBIDDEN, "UNAUTHORIZED_ACCESS", "해당 댓글에 대한 권한이 없습니다."),
    INVALID_TARGET_TYPE(HttpStatus.BAD_REQUEST, "INVALID_TARGET_TYPE", "지원하지 않는 게시판 타입입니다."),
    TARGET_NOT_FOUND(HttpStatus.NOT_FOUND, "TARGET_NOT_FOUND", "댓글 대상 게시물을 찾을 수 없습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;

    @Override public HttpStatus getStatus() { return status; }
    @Override public String getCode() { return code; }
    @Override public String getMessage() { return message; }
}