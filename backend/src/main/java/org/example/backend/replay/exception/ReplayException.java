package org.example.backend.replay.exception;

import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.exception.ErrorCode;

public class ReplayException extends BusinessException {

    // Replay 예외를 생성한다.
    public ReplayException(ErrorCode errorCode) {
        super(errorCode);
    }

    // 메시지를 재정의한 Replay 예외를 생성한다.
    public ReplayException(ErrorCode errorCode, String overrideMessage) {
        super(errorCode, overrideMessage);
    }
}
