package org.example.backend.global.exception;

import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
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

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(
            BusinessException e, HttpServletRequest request
    ) {
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
    public ResponseEntity<ErrorResponse> handleMethodArgumentNotValid(
            MethodArgumentNotValidException e,
            HttpServletRequest request
    ) {
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
    public ResponseEntity<ErrorResponse> handleConstraintViolation(
            ConstraintViolationException e,
            HttpServletRequest request
    ) {
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
    public ResponseEntity<ErrorResponse> handleNotReadable(
            HttpMessageNotReadableException e,
            HttpServletRequest request
    ) {
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
    public ResponseEntity<ErrorResponse> handleTypeMismatch(
            MethodArgumentTypeMismatchException e,
            HttpServletRequest request
    ) {
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

    // 예상하지 못한 예외: 내부 로그는 상세, 클라이언트 메시지는 단순
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleException(
            Exception e, HttpServletRequest request
    ) {
        log.error("Unhandled exception", e);

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