package org.example.backend.delivery.exception;

import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.exception.ErrorCode;

public class DeliveryException extends BusinessException {
    public DeliveryException(ErrorCode errorCode) {
        super(errorCode);
    }

    public DeliveryException(ErrorCode errorCode, String overrideMessage) {
        super(errorCode, overrideMessage);
    }
}
