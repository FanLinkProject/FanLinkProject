package org.example.backend.ivs.exception;

import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.exception.ErrorCode;

public class IvsException extends BusinessException {

    // IVS 도메인 예외를 생성한다.
    public IvsException(ErrorCode errorCode) {
        super(errorCode);
    }

    // IVS 도메인 예외를 메시지와 함께 생성한다.
    public IvsException(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }
}
