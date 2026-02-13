package org.example.backend.like.exception;

import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.exception.ErrorCode;

public class LikeException extends BusinessException {
    public LikeException(ErrorCode errorCode) {
        super(errorCode);
    }

    public LikeException(ErrorCode errorCode, String overrideMessage) {
        super(errorCode, overrideMessage);
    }
}
