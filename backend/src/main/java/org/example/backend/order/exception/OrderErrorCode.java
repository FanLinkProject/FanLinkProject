package org.example.backend.order.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum OrderErrorCode implements ErrorCode {
    TEST_ORDER_NOT_FOUND(HttpStatus.NOT_FOUND, "TEST_ORDER_NOT_FOUND", "테스트 주문이 존재하지 않습니다. SQL 스크립트를 먼저 실행해주세요."),
    ORDER_ALREADY_PROCESSED(HttpStatus.BAD_REQUEST, "ORDER_ALREADY_PROCESSED", "주문이 이미 처리되었습니다."),
    PRODUCT_NOT_FOUND(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "존재하지 않는 상품입니다."),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "사용자를 찾을 수 없습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
