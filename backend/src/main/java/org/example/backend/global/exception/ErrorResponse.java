package org.example.backend.global.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.Map;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {
    private final Instant timestamp;
    private final int status;
    private final String error;      // e.g., "CONFLICT"
    private final String code;       // e.g., "USER_DUPLICATE"
    private final String message;    // human-readable
    private final String path;       // request URI
    private final Map<String, Object> details; // optional
}