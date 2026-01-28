package org.example.backend.payment.exception;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;


public class PaymentExceptions extends BusinessException {

    public PaymentExceptions(ErrorCode errorCode) {
        super(errorCode);
    }

    public PaymentExceptions(ErrorCode errorCode, String overrideMessage) {
        super(errorCode, overrideMessage);
    }
}
