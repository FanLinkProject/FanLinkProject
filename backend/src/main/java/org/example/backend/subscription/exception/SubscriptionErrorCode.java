package org.example.backend.subscription.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum SubscriptionErrorCode implements ErrorCode {
    DUPLICATE_SUBSCRIPTION(HttpStatus.BAD_REQUEST, "DUPLICATE_SUBSCRIPTION", "이미 구독 중인 상품입니다."),
    SUBSCRIPTION_NOT_FOUND(HttpStatus.NOT_FOUND, "SUBSCRIPTION_NOT_FOUND", "구독 정보를 찾을 수 없습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
