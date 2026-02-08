package org.example.backend.post.exception;

import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.exception.ErrorCode;

public class PostException extends BusinessException {
    public PostException(ErrorCode errorCode) {
        super(errorCode);
    }
}
