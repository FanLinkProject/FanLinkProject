package org.example.backend.payment.exception;

import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.exception.ErrorCode;

public class PaymentException extends BusinessException {
    public PaymentException(ErrorCode errorCode) {
        super(errorCode);
    }
}
