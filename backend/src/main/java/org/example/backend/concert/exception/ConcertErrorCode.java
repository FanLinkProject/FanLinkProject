package org.example.backend.concert.exception;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

@RequiredArgsConstructor
public enum ConcertErrorCode implements ErrorCode {

    // ====== NOT FOUND ======
    CONCERT_NOT_FOUND(HttpStatus.NOT_FOUND, "CONCERT_NOT_FOUND", "존재하지 않는 공연입니다."),
    LOCATION_NOT_FOUND(HttpStatus.NOT_FOUND, "LOCATION_NOT_FOUND", "존재하지 않는 위치입니다."),
    CONCERT_ARTIST_NOT_FOUND(HttpStatus.NOT_FOUND, "CONCERT_ARTIST_NOT_FOUND", "공연-아티스트 관계를 찾을 수 없습니다."),

    // ====== 권한/소유 관련 ======
    NOT_CONCERT_OWNER(HttpStatus.FORBIDDEN, "NOT_CONCERT_OWNER", "본인이 생성한 공연이 아닙니다."),
    NOT_ARTIST_USER(HttpStatus.FORBIDDEN, "NOT_ARTIST_USER", "아티스트만 공연을 생성할 수 있습니다."),

    // ====== 생성/수정 검증 ======
    INVALID_DATE_RANGE(HttpStatus.BAD_REQUEST, "INVALID_DATE_RANGE", "공연 시작 시간은 종료 시간보다 이전이어야 합니다."),
    INVALID_SALE_PERIOD(HttpStatus.BAD_REQUEST, "INVALID_SALE_PERIOD", "예매 기간이 공연 시간과 겹치거나 잘못되었습니다."),
    INVALID_TICKET_COUNT(HttpStatus.BAD_REQUEST, "INVALID_TICKET_COUNT", "티켓 수량은 0 이상이어야 합니다."),
    EMPTY_ARTIST_LIST(HttpStatus.BAD_REQUEST, "EMPTY_ARTIST_LIST", "공연에는 최소 1명의 아티스트가 필요합니다."),
    DUPLICATE_ARTIST(HttpStatus.BAD_REQUEST, "DUPLICATE_ARTIST", "이미 추가된 아티스트입니다."),

    // ====== 비즈니스 로직 ======
    TICKET_SALE_NOT_STARTED(HttpStatus.BAD_REQUEST, "TICKET_SALE_NOT_STARTED", "아직 예매 시작 시간이 아닙니다."),
    TICKET_SALE_ENDED(HttpStatus.BAD_REQUEST, "TICKET_SALE_ENDED", "예매 기간이 종료되었습니다."),
    CONCERT_ALREADY_STARTED(HttpStatus.BAD_REQUEST, "CONCERT_ALREADY_STARTED", "이미 시작된 공연입니다."),
    CONCERT_ALREADY_ENDED(HttpStatus.BAD_REQUEST, "CONCERT_ALREADY_ENDED", "이미 종료된 공연입니다."),
    CANNOT_MODIFY_STARTED_CONCERT(HttpStatus.BAD_REQUEST, "CANNOT_MODIFY_STARTED_CONCERT", "시작된 공연은 수정할 수 없습니다."),
    CANNOT_DELETE_STARTED_CONCERT(HttpStatus.BAD_REQUEST, "CANNOT_DELETE_STARTED_CONCERT", "시작된 공연은 삭제할 수 없습니다."),

    ;

    private final HttpStatus status;
    private final String code;
    private final String message;

    @Override
    public HttpStatus getStatus() {
        return status;
    }

    @Override
    public String getCode() {
        return code;
    }

    @Override
    public String getMessage() {
        return message;
    }
}
