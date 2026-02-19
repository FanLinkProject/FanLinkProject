package org.example.backend.ticket.exception;

import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.exception.ErrorCode;

public class TicketException extends BusinessException {
    public TicketException(ErrorCode errorCode) {
        super(errorCode);
    }
}
