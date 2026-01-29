package org.example.backend.settlement.exception;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

@RequiredArgsConstructor
public enum SettlementErrorCode implements ErrorCode {

    SETTLEMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "SETTLEMENT_NOT_FOUND", "존재하지 않는 정산 내역입니다."),
    SETTLEMENT_ACCESS_DENIED(HttpStatus.FORBIDDEN, "SETTLEMENT_ACCESS_DENIED", "해당 정산 내역에 접근할 권한이 없습니다."),
    SETTLEMENT_DETAIL_NOT_FOUND(HttpStatus.NOT_FOUND, "SETTLEMENT_DETAIL_NOT_FOUND", "정산 상세 내역을 찾을 수 없습니다."),
    SETTLEMENT_PENDING_NOT_FOUND(HttpStatus.NOT_FOUND, "SETTLEMENT_PENDING_NOT_FOUND", "정산 대기 내역을 찾을 수 없습니다."),
    SETTLEMENT_ALREADY_PROCESSED(HttpStatus.CONFLICT, "SETTLEMENT_ALREADY_PROCESSED", "이미 처리된 정산 내역입니다."),
    SETTLEMENT_INVALID_STATUS(HttpStatus.BAD_REQUEST, "SETTLEMENT_INVALID_STATUS", "잘못된 정산 상태입니다."),
    SETTLEMENT_CALCULATION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "SETTLEMENT_CALCULATION_FAILED", "정산 금액 계산 중 오류가 발생했습니다."),
    SETTLEMENT_ARTIST_NOT_FOUND(HttpStatus.NOT_FOUND, "SETTLEMENT_ARTIST_NOT_FOUND", "아티스트 정보를 찾을 수 없습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;


    @Override public HttpStatus getStatus() {return status;}
    @Override public String getCode() {return code;}
    @Override public String getMessage() {return message;}
}
