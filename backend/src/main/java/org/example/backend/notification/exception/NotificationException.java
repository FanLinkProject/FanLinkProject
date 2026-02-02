package org.example.backend.notification.exception;

import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.exception.ErrorCode;

public class NotificationException extends BusinessException {
	public NotificationException(ErrorCode errorCode) {
		super(errorCode);
	}

	public NotificationException(ErrorCode errorCode, String overrideMessage) {
		super(errorCode, overrideMessage);
	}
}
