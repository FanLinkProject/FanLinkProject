package org.example.backend.media_asset.exception;

import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

public enum MediaAssetErrorCode implements ErrorCode {

    MEDIA_ASSET_NOT_FOUND(HttpStatus.NOT_FOUND, "MEDIA_ASSET_NOT_FOUND", "미디어 에셋을 찾을 수 없습니다."),
    MEDIA_ASSET_ACCESS_DENIED(HttpStatus.FORBIDDEN, "MEDIA_ASSET_ACCESS_DENIED", "미디어 에셋에 접근할 권한이 없습니다."),
    INVALID_MEDIA_ASSET_TYPE(HttpStatus.BAD_REQUEST, "INVALID_MEDIA_ASSET_TYPE", "유효하지 않은 미디어 에셋 타입입니다."),
    INVALID_MEDIA_ASSET_STATUS(HttpStatus.BAD_REQUEST, "INVALID_MEDIA_ASSET_STATUS", "유효하지 않은 미디어 에셋 상태입니다."),
    INVALID_OBJECT_KEY(HttpStatus.BAD_REQUEST, "INVALID_OBJECT_KEY", "S3 오브젝트 키가 올바르지 않습니다."),
    INVALID_MEDIA_ASSET_SIZE(HttpStatus.BAD_REQUEST, "INVALID_MEDIA_ASSET_SIZE", "미디어 에셋 크기 정보가 올바르지 않습니다."),
    MEDIA_ASSET_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "MEDIA_ASSET_SIZE_EXCEEDED", "미디어 에셋 크기 제한을 초과했습니다."),
    INVALID_MEDIA_ASSET_DURATION(HttpStatus.BAD_REQUEST, "INVALID_MEDIA_ASSET_DURATION", "미디어 에셋 길이 정보가 올바르지 않습니다."),
    MEDIA_ASSET_DURATION_EXCEEDED(HttpStatus.BAD_REQUEST, "MEDIA_ASSET_DURATION_EXCEEDED", "미디어 에셋 길이 제한을 초과했습니다."),
    INVALID_ATTACHMENT_COUNT(HttpStatus.BAD_REQUEST, "INVALID_ATTACHMENT_COUNT", "첨부 개수 정보가 올바르지 않습니다."),
    ATTACHMENT_LIMIT_EXCEEDED(HttpStatus.BAD_REQUEST, "ATTACHMENT_LIMIT_EXCEEDED", "첨부 개수 제한을 초과했습니다."),
    PRESIGNED_URL_EXPIRED(HttpStatus.GONE, "PRESIGNED_URL_EXPIRED", "Presigned URL이 만료되었습니다."),
    DUPLICATE_MEDIA_ASSET(HttpStatus.CONFLICT, "DUPLICATE_MEDIA_ASSET", "이미 등록된 미디어 에셋입니다."),
    MEDIA_ASSET_UPLOAD_NOT_ALLOWED(HttpStatus.FORBIDDEN, "MEDIA_ASSET_UPLOAD_NOT_ALLOWED", "미디어 에셋 업로드가 허용되지 않습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;

    MediaAssetErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }

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
