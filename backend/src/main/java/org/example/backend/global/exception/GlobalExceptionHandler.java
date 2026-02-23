package org.example.backend.global.exception;

import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.Instant;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * SSE 요청이거나 응답이 이미 커밋된 경우 JSON(ErrorResponse)을 쓰지 않고 빈 응답만 반환해야 함.
     * (text/event-stream + JSON 변환 시 HttpMessageNotWritableException / response committed 연쇄 예외 방지)
     */
    private boolean shouldSkipJsonErrorBody(HttpServletRequest request, HttpServletResponse response) {
        if (response.isCommitted()) {
            return true;
        }
        String accept = request.getHeader("Accept");
        return accept != null && accept.contains(MediaType.TEXT_EVENT_STREAM_VALUE);
    }

    @ExceptionHandler(UsernameNotFoundException.class)
    public ResponseEntity<?> handleUsernameNotFound(
            UsernameNotFoundException e, HttpServletRequest request, HttpServletResponse response
    ) {
        if (shouldSkipJsonErrorBody(request, response)) {
            return ResponseEntity.status(401).build();
        }
        ErrorResponse body = ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(401)
                .error("Unauthorized")
                .code("USER_NOT_FOUND")
                .message("이메일 또는 비밀번호를 확인해 주세요.")
                .path(request.getRequestURI())
                .build();
        return ResponseEntity.status(401).body(body);
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<?> handleBusinessException(
            BusinessException e, HttpServletRequest request, HttpServletResponse response
    ) {
        if (shouldSkipJsonErrorBody(request, response)) {
            log.debug("SSE or committed response, skipping JSON error body for BusinessException");
            return ResponseEntity.status(e.getErrorCode().getStatus()).build();
        }
        ErrorCode ec = e.getErrorCode();
        ErrorResponse body = ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(ec.getStatus().value())
                .error(ec.getStatus().getReasonPhrase())
                .code(ec.getCode())
                .message(e.getMessage())
                .path(request.getRequestURI())
                .build();
        return ResponseEntity.status(ec.getStatus()).body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleMethodArgumentNotValid(
            MethodArgumentNotValidException e,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        if (shouldSkipJsonErrorBody(request, response)) {
            log.debug("SSE or committed response, skipping JSON error body for MethodArgumentNotValidException");
            return ResponseEntity.badRequest().build();
        }
        Map<String, Object> details = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors().forEach(error ->
                details.put(error.getField(), error.getDefaultMessage())
        );

        ErrorResponse body = ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(400)
                .error("Bad Request")
                .code("VALIDATION_ERROR")
                .message("요청 값이 올바르지 않습니다.")
                .path(request.getRequestURI())
                .details(details)
                .build();

        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<?> handleConstraintViolation(
            ConstraintViolationException e,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        if (shouldSkipJsonErrorBody(request, response)) {
            log.debug("SSE or committed response, skipping JSON error body for ConstraintViolationException");
            return ResponseEntity.badRequest().build();
        }
        ErrorResponse body = ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(400)
                .error("Bad Request")
                .code("INVALID_PARAMETER")
                .message("요청 파라미터가 올바르지 않습니다.")
                .path(request.getRequestURI())
                .details(Map.of(
                        "violations", e.getConstraintViolations().stream()
                                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                                .toList()
                ))
                .build();

        return ResponseEntity.badRequest().body(body);
    }

    //Body(JSON) enum 오타 → NotReadable
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<?> handleNotReadable(
            HttpMessageNotReadableException e,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        if (shouldSkipJsonErrorBody(request, response)) {
            log.debug("SSE or committed response, skipping JSON error body for HttpMessageNotReadableException");
            return ResponseEntity.badRequest().build();
        }
        Throwable cause = e.getCause();

        if (cause instanceof InvalidFormatException ife) {
            Class<?> targetType = ife.getTargetType();
            Object invalidValue = ife.getValue();

            // enum 변환 실패면 허용값 내려주기
            if (targetType != null && targetType.isEnum()) {
                String allowed = Arrays.stream(targetType.getEnumConstants())
                        .map(Object::toString)
                        .collect(Collectors.joining(", "));

                Map<String, Object> details = new LinkedHashMap<>();
                details.put("invalidValue", invalidValue);
                details.put("allowedValues", allowed);
                details.put("path", ife.getPathReference()); // 어떤 필드에서 실패했는지 힌트

                ErrorResponse body = ErrorResponse.builder()
                        .timestamp(Instant.now())
                        .status(400)
                        .error("Bad Request")
                        .code("INVALID_ENUM")
                        .message("열거형(enum) 값이 올바르지 않습니다.")
                        .path(request.getRequestURI())
                        .details(details)
                        .build();

                return ResponseEntity.badRequest().body(body);
            }
        }

        // enum이 아니거나 파싱 실패 등 기타 케이스
        ErrorResponse body = ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(400)
                .error("Bad Request")
                .code("MALFORMED_JSON")
                .message("요청 본문을 해석할 수 없습니다.")
                .path(request.getRequestURI())
                .build();

        return ResponseEntity.badRequest().body(body);
    }

    //Query/Path enum 오타 → TypeMismatch
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<?> handleTypeMismatch(
            MethodArgumentTypeMismatchException e,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        if (shouldSkipJsonErrorBody(request, response)) {
            log.debug("SSE or committed response, skipping JSON error body for MethodArgumentTypeMismatchException");
            return ResponseEntity.badRequest().build();
        }
        Class<?> required = e.getRequiredType();

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("parameter", e.getName());
        details.put("invalidValue", e.getValue());

        if (required != null && required.isEnum()) {
            String allowed = Arrays.stream(required.getEnumConstants())
                    .map(Object::toString)
                    .collect(Collectors.joining(", "));
            details.put("allowedValues", allowed);

            ErrorResponse body = ErrorResponse.builder()
                    .timestamp(Instant.now())
                    .status(400)
                    .error("Bad Request")
                    .code("INVALID_ENUM")
                    .message("열거형(enum) 파라미터 값이 올바르지 않습니다.")
                    .path(request.getRequestURI())
                    .details(details)
                    .build();
            return ResponseEntity.badRequest().body(body);
        }

        ErrorResponse body = ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(400)
                .error("Bad Request")
                .code("TYPE_MISMATCH")
                .message("요청 파라미터 타입이 올바르지 않습니다.")
                .path(request.getRequestURI())
                .details(details)
                .build();

        return ResponseEntity.badRequest().body(body);
    }

    // RuntimeException (AuthService 등에서 래핑한 예외) - 원인 메시지 노출로 디버깅 용이
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<?> handleRuntimeException(
            RuntimeException e, HttpServletRequest request, HttpServletResponse response
    ) {
        log.error("RuntimeException", e);
        if (shouldSkipJsonErrorBody(request, response)) {
            return ResponseEntity.status(500).build();
        }
        String msg = e.getCause() != null ? e.getCause().getMessage() : e.getMessage();
        if (msg == null) msg = "서버 오류가 발생했습니다.";
        ErrorResponse body = ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(500)
                .error("Internal Server Error")
                .code("INTERNAL_ERROR")
                .message(msg)
                .path(request.getRequestURI())
                .build();
        return ResponseEntity.status(500).body(body);
    }

    // 예상하지 못한 예외: 내부 로그는 상세, 클라이언트 메시지는 단순
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleException(
            Exception e, HttpServletRequest request, HttpServletResponse response
    ) {
        log.error("Unhandled exception", e);
        if (shouldSkipJsonErrorBody(request, response)) {
            log.debug("SSE or committed response, skipping JSON error body for Exception");
            return ResponseEntity.status(500).build();
        }
        ErrorResponse body = ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(500)
                .error("Internal Server Error")
                .code("INTERNAL_ERROR")
                .message("서버 오류가 발생했습니다.")
                .path(request.getRequestURI())
                .build();
        return ResponseEntity.status(500).body(body);
    }
}