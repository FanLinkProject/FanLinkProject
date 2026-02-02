package org.example.backend.music_video.exception;

import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.exception.ErrorCode;

public class MusicVideoException extends BusinessException {

    public MusicVideoException(ErrorCode errorCode) {
        super(errorCode);
    }

    public MusicVideoException(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }
}
