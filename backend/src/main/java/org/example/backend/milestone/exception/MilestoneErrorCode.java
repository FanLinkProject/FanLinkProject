package org.example.backend.milestone.exception;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

@RequiredArgsConstructor
public enum MilestoneErrorCode implements ErrorCode {

    // ====== NOT FOUND ======
    MILESTONE_NOT_FOUND(HttpStatus.NOT_FOUND, "MILESTONE_NOT_FOUND", "존재하지 않는 마일스톤입니다."),
    FANPROFILE_NOT_FOUND(HttpStatus.NOT_FOUND, "FANPROFILE_NOT_FOUND", "존재하지 않는 팬프로필입니다."),
    ARTIST_NOT_FOUND(HttpStatus.NOT_FOUND, "ARTIST_NOT_FOUND", "존재하지 않는 아티스트입니다."),

    // ====== 권한/소유 관련 ======
    NOT_ARTIST_USER(HttpStatus.FORBIDDEN, "NOT_ARTIST_USER", "아티스트만 마일스톤을 생성할 수 있습니다."),
    NOT_MILESTONE_OWNER(HttpStatus.FORBIDDEN, "NOT_MILESTONE_OWNER", "본인이 소유한 마일스톤이 아닙니다."),
    NOT_FANPROFILE_OWNER(HttpStatus.FORBIDDEN, "NOT_FANPROFILE_OWNER", "본인의 팬 프로필만 방문일을 갱신할 수 있습니다."),

    // ====== 생성/수정 검증 ======
    DUPLICATE_MILESTONE_NAME(HttpStatus.BAD_REQUEST, "DUPLICATE_MILESTONE_NAME", "해당 이름의 등급이 이미 존재합니다."),
    DUPLICATE_SORT_ORDER(HttpStatus.BAD_REQUEST, "DUPLICATE_SORT_ORDER", "해당 순서 번호(sortOrder)는 이미 사용 중입니다."),
    INVALID_CONDITION(HttpStatus.BAD_REQUEST, "INVALID_CONDITION", "조건 형식이 올바르지 않습니다."),
    EMPTY_CONDITION_LIST(HttpStatus.BAD_REQUEST, "EMPTY_CONDITION_LIST", "마일스톤 조건은 하나 이상이어야 합니다."),

    // ====== 삭제 관련 ======
    CANNOT_DELETE_ACTIVE_MILESTONE(HttpStatus.BAD_REQUEST, "CANNOT_DELETE_ACTIVE_MILESTONE", "사용 중인 등급은 삭제할 수 없습니다.");

    ;

    private final HttpStatus status;
    private final String code;
    private final String message;

    @Override public HttpStatus getStatus() { return status; }
    @Override public String getCode() { return code; }
    @Override public String getMessage() { return message; }
}
