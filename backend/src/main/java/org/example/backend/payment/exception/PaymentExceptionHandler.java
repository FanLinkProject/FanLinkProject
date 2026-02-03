package org.example.backend.payment.exception;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.global.exception.ErrorResponse;
import org.example.backend.global.exception.GlobalExceptionHandler;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;

@Slf4j
@RestControllerAdvice(basePackages = "org.example.backend.payment")
@Order(Ordered.HIGHEST_PRECEDENCE) // GlobalExceptionHandler보다 우선순위 높게 설정
public class PaymentExceptionHandler extends GlobalExceptionHandler {

    // 결제 관련 타임아웃, 결제 실패 등의 구체적인 예외 처리
    @ExceptionHandler(PaymentException.class)
    public ResponseEntity<ErrorResponse> handlePaymentException(PaymentException e, HttpServletRequest request) {
        log.error("Payment Exception occurred: {}", e.getMessage());

        ErrorResponse body = ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(e.getErrorCode().getStatus().value())
                .error(e.getErrorCode().getStatus().getReasonPhrase())
                .code(e.getErrorCode().getCode())
                .message(e.getMessage())
                .path(request.getRequestURI())
                .build();

        return ResponseEntity.status(e.getErrorCode().getStatus()).body(body);
    }
}
