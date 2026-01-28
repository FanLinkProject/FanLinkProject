package org.example.backend.chat.exception;

import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.exception.ErrorCode;

public class ChatException extends BusinessException {
	public ChatException(ErrorCode errorCode) {
		super(errorCode);
	}

	public ChatException(ErrorCode errorCode, String overrideMessage) {
		super(errorCode, overrideMessage);
	}
}
