package org.example.backend.live_session.exception;

import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.exception.ErrorCode;

public class LiveSessionException extends BusinessException {
	public LiveSessionException(ErrorCode errorCode) {
		super(errorCode);
	}

	public LiveSessionException(ErrorCode errorCode, String overrideMessage) {
		super(errorCode, overrideMessage);
	}
}
