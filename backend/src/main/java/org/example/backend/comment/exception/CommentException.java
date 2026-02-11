package org.example.backend.comment.exception;

import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.exception.ErrorCode;

public class CommentException extends BusinessException {
    public CommentException(ErrorCode errorCode) {
        super(errorCode);
    }

    public CommentException(ErrorCode errorCode, String overrideMessage) {
        super(errorCode, overrideMessage);
    }
}
