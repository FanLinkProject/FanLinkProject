package org.example.backend.product.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ProductErrorCode implements ErrorCode {
    PRODUCT_NOT_FOUND(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "상품을 찾을 수 없습니다."),
    INVALID_PRODUCT_TYPE(HttpStatus.BAD_REQUEST, "INVALID_PRODUCT_TYPE", "유효하지 않은 상품 타입입니다."),
    INVALID_PAYMENT_METHOD(HttpStatus.BAD_REQUEST, "INVALID_PAYMENT_METHOD", "유효하지 않은 결제 수단입니다."),
    INVALID_PRICE(HttpStatus.BAD_REQUEST, "INVALID_PRICE", "유효하지 않은 가격입니다."),
    SETTLEMENT_ARTIST_REQUIRED(HttpStatus.BAD_REQUEST, "SETTLEMENT_ARTIST_REQUIRED", "정산 대상 상품은 아티스트 ID가 필수입니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
