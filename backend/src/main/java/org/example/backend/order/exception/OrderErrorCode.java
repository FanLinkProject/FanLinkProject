package org.example.backend.order.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum OrderErrorCode implements ErrorCode {

    PRODUCT_NOT_FOUND(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "존재하지 않는 상품입니다."),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "사용자를 찾을 수 없습니다."),
    INVALID_SHIPPING_ADDRESS(HttpStatus.BAD_REQUEST, "INVALID_SHIPPING_ADDRESS", "배송지 정보가 올바르지 않습니다."),
    INVALID_COUNTRY_CODE(HttpStatus.BAD_REQUEST, "INVALID_COUNTRY_CODE", "국가 코드는 ISO 2자리 대문자여야 합니다."),
    DUPLICATE_MEMBERSHIP_ORDER(HttpStatus.BAD_REQUEST, "DUPLICATE_MEMBERSHIP_ORDER",
            "이미 유효한 멤버십이 존재합니다. (10개월 내 중복 구매 불가)");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
