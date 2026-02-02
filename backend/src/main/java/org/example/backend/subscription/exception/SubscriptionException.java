package org.example.backend.subscription.exception;

import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.exception.ErrorCode;

public class SubscriptionException extends BusinessException {
    public SubscriptionException(ErrorCode errorCode) {
        super(errorCode);
    }
}
