package org.example.backend.user.exception;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

@RequiredArgsConstructor
public enum UserErrorCode implements ErrorCode {

    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "존재하지 않는 회원입니다."),
    USER_ACCESS_DENIED(HttpStatus.FORBIDDEN, "USER_ACCESS_DENIED", "해당 정산 내역에 접근할 권한이 없습니다."),
    USER_DETAIL_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_DETAIL_NOT_FOUND", "정산 상세 내역을 찾을 수 없습니다."),

    // 인증 관련
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "이미 존재하는 이메일입니다."),
    NICKNAME_ALREADY_EXISTS(HttpStatus.CONFLICT, "NICKNAME_ALREADY_EXISTS", "이미 존재하는 닉네임입니다."),
    PASSWORD_MISMATCH(HttpStatus.UNAUTHORIZED, "PASSWORD_MISMATCH", "비밀번호가 일치하지 않습니다."),
    ACCOUNT_INACTIVE(HttpStatus.FORBIDDEN, "ACCOUNT_INACTIVE", "비활성화된 계정입니다."),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "INVALID_TOKEN", "유효하지 않은 토큰입니다."),
    UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "인증된 사용자가 없습니다."),
    ACCOUNT_ALREADY_DELETED(HttpStatus.BAD_REQUEST, "ACCOUNT_ALREADY_DELETED", "이미 탈퇴한 계정입니다."),

    // OAuth2 관련
    OAUTH2_PROVIDER_NOT_SUPPORTED(HttpStatus.BAD_REQUEST, "OAUTH_001", "지원하지 않는 소셜 로그인 플랫폼입니다."),
    OAUTH2_EMAIL_NOT_FOUND(HttpStatus.BAD_REQUEST, "OAUTH_002", "소셜 로그인 제공자로부터 이메일 정보를 받아올 수 없습니다."),
    OAUTH2_PROCESSING_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "OAUTH_003", "소셜 로그인 처리 중 오류가 발생했습니다."),

    // 계좌 관련
    ACCOUNT_NOT_FOUND(HttpStatus.NOT_FOUND, "ACCOUNT_NOT_FOUND", "계좌 정보를 찾을 수 없습니다."),
    ACCOUNT_ALREADY_EXISTS(HttpStatus.CONFLICT, "ACCOUNT_ALREADY_EXISTS", "이미 등록된 계좌 정보가 있습니다."),

    // 캔디 관련
    NOT_ENOUGH_CANDY(HttpStatus.BAD_REQUEST, "NOT_ENOUGH_CANDY", "캔디가 부족합니다."),

    // 인증 코드 관련
    EMAIL_VERIFICATION_FAILED(HttpStatus.BAD_REQUEST, "EMAIL_VERIFICATION_FAILED", "이메일 인증이 완료되지 않았습니다. 인증 코드를 확인해주세요."),
    PHONE_VERIFICATION_FAILED(HttpStatus.BAD_REQUEST, "PHONE_VERIFICATION_FAILED", "전화번호 인증이 완료되지 않았습니다. 인증번호를 확인해주세요."),
    PHONE_NUMBER_ALREADY_EXISTS(HttpStatus.CONFLICT, "PHONE_NUMBER_ALREADY_EXISTS", "이미 사용 중인 전화번호입니다."),

    // 발송 관련
    EMAIL_SEND_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "EMAIL_SEND_FAILED", "이메일 발송에 실패했습니다."),
    SMS_SEND_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "SMS_SEND_FAILED", "SMS 발송에 실패했습니다."),

    // 그룹 관련
    GROUP_NOT_FOUND(HttpStatus.NOT_FOUND, "GROUP_NOT_FOUND", "존재하지 않는 그룹입니다."),
    INVALID_GROUP_ROLE(HttpStatus.BAD_REQUEST, "INVALID_GROUP_ROLE", "해당 유저는 그룹 역할이 아닙니다."),
    ARTIST_ALREADY_IN_GROUP(HttpStatus.CONFLICT, "ARTIST_ALREADY_IN_GROUP", "이미 다른 그룹에 소속된 아티스트입니다."),
    GROUP_NAME_ALREADY_EXISTS(HttpStatus.CONFLICT, "GROUP_NAME_ALREADY_EXISTS", "이미 존재하는 그룹명입니다."),
        INVALID_NAME_FORMAT(HttpStatus.BAD_REQUEST, "INVALID_NAME_FORMAT", "이름 형식이 올바르지 않습니다."),

        // 팔로우 관련
        FOLLOW_TARGET_NOT_ARTIST(HttpStatus.BAD_REQUEST, "FOLLOW_TARGET_NOT_ARTIST", "팔로우 대상은 아티스트 또는 그룹만 가능합니다."),
        FOLLOW_SELF_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "FOLLOW_SELF_NOT_ALLOWED", "자기 자신은 팔로우할 수 없습니다."),
        FOLLOW_ALREADY_EXISTS(HttpStatus.CONFLICT, "FOLLOW_ALREADY_EXISTS", "이미 팔로우 중입니다."),
        FOLLOW_NOT_FOUND(HttpStatus.NOT_FOUND, "FOLLOW_NOT_FOUND", "팔로우 관계가 존재하지 않습니다.");

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