package org.example.backend.ticket.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum TicketErrorCode implements ErrorCode {
    TICKET_NOT_FOUND(HttpStatus.NOT_FOUND, "TICKET_NOT_FOUND", "티켓을 찾을 수 없습니다."),
    TICKET_ACCESS_DENIED(HttpStatus.FORBIDDEN, "TICKET_ACCESS_DENIED", "해당 티켓에 대한 권한이 없습니다."),
    TICKET_ALREADY_USED(HttpStatus.BAD_REQUEST, "TICKET_ALREADY_USED", "이미 사용된 티켓입니다."),
    TICKET_CANCELLED(HttpStatus.BAD_REQUEST, "TICKET_CANCELLED", "취소된 티켓입니다."),
    TICKET_EXPIRED(HttpStatus.BAD_REQUEST, "TICKET_EXPIRED", "만료된 티켓입니다."),
    TICKET_INVALID_SIGNATURE(HttpStatus.UNAUTHORIZED, "TICKET_INVALID_SIGNATURE", "유효하지 않은 티켓 서명입니다."),
    TICKET_SIGNING_NOT_CONFIGURED(HttpStatus.SERVICE_UNAVAILABLE, "TICKET_SIGNING_NOT_CONFIGURED", "티켓 서명 설정이 되어 있지 않습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
