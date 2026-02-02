package org.example.backend.settlement.exception;

import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.exception.ErrorCode;

public class SettlementException extends BusinessException {

    public SettlementException(ErrorCode errorCode) {
        super(errorCode);
    }

    public SettlementException(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }
}