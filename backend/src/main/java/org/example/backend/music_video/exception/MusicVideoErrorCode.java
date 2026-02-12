package org.example.backend.music_video.exception;

import org.example.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

public enum MusicVideoErrorCode implements ErrorCode {

    INVALID_YOUTUBE_URL(HttpStatus.BAD_REQUEST, "INVALID_YOUTUBE_URL", "유효하지 않은 유튜브 URL입니다."),
    DUPLICATE_MUSIC_VIDEO(HttpStatus.CONFLICT, "DUPLICATE_MUSIC_VIDEO", "이미 등록된 뮤직비디오입니다."),
    YOUTUBE_VIDEO_NOT_FOUND(HttpStatus.NOT_FOUND, "YOUTUBE_VIDEO_NOT_FOUND", "유효한 유튜브 영상이 아닙니다."),
    YOUTUBE_API_KEY_MISSING(HttpStatus.INTERNAL_SERVER_ERROR, "YOUTUBE_API_KEY_MISSING", "YouTube API 키가 설정되지 않았습니다."),
    YOUTUBE_API_FAILED(HttpStatus.BAD_GATEWAY, "YOUTUBE_API_FAILED", "YouTube API 호출에 실패했습니다."),
    MUSIC_VIDEO_NOT_FOUND(HttpStatus.NOT_FOUND, "MUSIC_VIDEO_NOT_FOUND", "뮤직비디오를 찾을 수 없습니다."),
    ARTIST_NOT_FOUND(HttpStatus.NOT_FOUND, "ARTIST_NOT_FOUND", "아티스트를 찾을 수 없습니다."),
    FORBIDDEN_OPERATION(HttpStatus.FORBIDDEN, "FORBIDDEN_OPERATION", "작업을 수행할 권한이 없습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;

    MusicVideoErrorCode(HttpStatus status, String code, String message) {
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
