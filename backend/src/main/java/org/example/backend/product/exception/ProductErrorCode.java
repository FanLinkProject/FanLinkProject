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
    SETTLEMENT_ARTIST_REQUIRED(HttpStatus.BAD_REQUEST, "SETTLEMENT_ARTIST_REQUIRED", "정산 대상 상품은 아티스트 ID가 필수입니다."),
    OUT_OF_STOCK(HttpStatus.BAD_REQUEST, "OUT_OF_STOCK", "재고가 부족합니다."),
    MEDIA_ASSET_NOT_FOUND(HttpStatus.NOT_FOUND, "MEDIA_ASSET_NOT_FOUND", "미디어 파일을 찾을 수 없습니다."),
    MEDIA_ASSET_NOT_READY(HttpStatus.CONFLICT, "MEDIA_ASSET_NOT_READY", "미디어 파일 업로드가 완료되지 않았습니다."),
    INVALID_MEDIA_ASSET_CATEGORY(HttpStatus.BAD_REQUEST, "INVALID_MEDIA_ASSET_CATEGORY", "상품 첨부는 PRODUCT_IMAGE 또는 PRODUCT_DESCRIBE_IMAGE만 가능합니다."),
    PRODUCT_ACCESS_DENIED(HttpStatus.FORBIDDEN, "PRODUCT_ACCESS_DENIED", "상품 등록/수정은 팬페이지 관리 계정만 가능합니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
