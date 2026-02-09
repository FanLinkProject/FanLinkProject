package org.example.backend.milestone.exception;


import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.exception.ErrorCode;

public class MilestoneException extends BusinessException {
    public MilestoneException(ErrorCode errorCode) {
        super(errorCode);
    }
    public MilestoneException(ErrorCode errorCode, String overrideMessage) {
        super(errorCode, overrideMessage);
    }
}