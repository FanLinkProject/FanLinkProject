package org.example.backend.milestone.exception;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

@RequiredArgsConstructor
public enum MilestoneErrorCode implements ErrorCode {

    // ====== NOT FOUND ======
    MILESTONE_NOT_FOUND(HttpStatus.NOT_FOUND, "MILESTONE_NOT_FOUND", "존재하지 않는 마일스톤입니다."),
    FANPROFILE_NOT_FOUND(HttpStatus.NOT_FOUND, "FANPROFILE_NOT_FOUND", "존재하지 않는 팬프로필입니다."),
    GROUP_NOT_FOUND(HttpStatus.NOT_FOUND, "GROUP_NOT_FOUND", "존재하지 않는 그룹 계정입니다."),

    // ====== 권한/소유 관련 ======
    NOT_GROUP_USER(HttpStatus.FORBIDDEN, "NOT_GROUP_USER", "해당 ID는 아티스트/그룹 계정이 아닙니다. 아티스트 또는 그룹 페이지에서만 팬 프로필을 만들 수 있습니다."),
    FAN_ONLY_CREATE_PROFILE(HttpStatus.FORBIDDEN, "FAN_ONLY_CREATE_PROFILE", "팬(일반 회원)만 팬 프로필을 생성할 수 있습니다. 로그인 계정을 확인해 주세요."),
    NOT_MILESTONE_OWNER(HttpStatus.FORBIDDEN, "NOT_MILESTONE_OWNER", "본인이 소유한 마일스톤이 아닙니다."),
    NOT_FANPROFILE_OWNER(HttpStatus.FORBIDDEN, "NOT_FANPROFILE_OWNER", "본인의 팬 프로필만 방문일을 갱신할 수 있습니다."),
    ALREADY_VISITED_TODAY(HttpStatus.BAD_REQUEST, "ALREADY_VISITED_TODAY", "오늘 이미 출석했습니다. 내일 다시 시도해 주세요."),

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
