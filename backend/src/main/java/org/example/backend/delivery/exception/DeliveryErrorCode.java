package org.example.backend.delivery.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum DeliveryErrorCode implements ErrorCode {
    DELIVERY_NOT_FOUND(HttpStatus.NOT_FOUND, "DELIVERY_NOT_FOUND", "배송 정보를 찾을 수 없습니다."),
    DELIVERY_ACCESS_DENIED(HttpStatus.FORBIDDEN, "DELIVERY_ACCESS_DENIED", "배송 정보 접근 권한이 없습니다."),
    INVALID_WEBHOOK_SIGNATURE(HttpStatus.UNAUTHORIZED, "INVALID_WEBHOOK_SIGNATURE", "유효하지 않은 웹훅 서명입니다."),
    INVALID_WEBHOOK_PAYLOAD(HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK_PAYLOAD", "유효하지 않은 웹훅 요청 본문입니다."),
    UNSUPPORTED_COURIER_CODE(HttpStatus.BAD_REQUEST, "UNSUPPORTED_COURIER_CODE", "지원하지 않는 택배사 코드입니다."),
    TRACKING_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "TRACKING_FAILED", "배송 추적 조회에 실패했습니다."),
    INVALID_TRACKING_NUMBER(HttpStatus.BAD_REQUEST, "INVALID_TRACKING_NUMBER", "유효하지 않은 운송장 번호입니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
