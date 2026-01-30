package org.example.backend.media_asset.exception;

import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.exception.ErrorCode;

public class MediaAssetException extends BusinessException {

    public MediaAssetException(ErrorCode errorCode) {
        super(errorCode);
    }

    public MediaAssetException(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }
}
