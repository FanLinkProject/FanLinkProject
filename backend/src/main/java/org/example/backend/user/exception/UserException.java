package org.example.backend.user.exception;

import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.exception.ErrorCode;

public class UserException extends BusinessException {

    public UserException(ErrorCode errorCode) {
        super(errorCode);
    }

    public UserException(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }
}