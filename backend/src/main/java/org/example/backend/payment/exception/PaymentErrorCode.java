package org.example.backend.payment.exception;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

@RequiredArgsConstructor
public enum PaymentErrorCode implements ErrorCode {

    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "P000", "Internal Server Error"),
    TOSS_PAYMENT_ERROR(HttpStatus.BAD_REQUEST, "P001", "Toss Payments Client Error"),
    TOSS_PAYMENT_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "P002", "Toss Payments Server Error");;

    private final HttpStatus status;
    private final String code;
    private final String message;

    @Override public HttpStatus getStatus() { return status; }
    @Override public String getCode() { return code; }
    @Override public String getMessage() { return message; }
}
