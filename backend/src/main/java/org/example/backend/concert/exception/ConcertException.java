package org.example.backend.concert.exception;

import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.exception.ErrorCode;

public class ConcertException extends BusinessException {
    public ConcertException(ErrorCode errorCode) {
        super(errorCode);
    }

    public ConcertException(ErrorCode errorCode, String overrideMessage) {
        super(errorCode, overrideMessage);
    }
}
