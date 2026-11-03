package com.runestone.treasury.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class GlobalTreasuryExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(GlobalTreasuryExceptionHandler.class);

  private Map<String, Object> buildErrorBody(String errorCode, String message) {
    Map<String, Object> body = new HashMap<>();
    body.put("timestamp", Instant.now().toString());
    body.put("errorCode", errorCode);
    body.put("message", message);
    body.put("traceId", UUID.randomUUID().toString());
    return body;
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<?> handleValidation(
      MethodArgumentNotValidException ex, HttpServletRequest request) {
    String fieldErrors =
        ex.getBindingResult().getFieldErrors().stream()
            .map(e -> e.getField() + ": " + e.getDefaultMessage())
            .collect(Collectors.joining("; "));
    log.warn("Validation error on {}: {}", request.getRequestURI(), fieldErrors);
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(buildErrorBody("VALIDATION_ERROR", fieldErrors));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<?> handleNotReadable(
      HttpMessageNotReadableException ex, HttpServletRequest request) {
    String msg =
        ex.getMostSpecificCause() != null
            ? ex.getMostSpecificCause().getMessage()
            : ex.getMessage();
    log.warn("Malformed HTTP request body on {}: {}", request.getRequestURI(), msg);
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(buildErrorBody("MALFORMED_REQUEST", "Malformed JSON request body: " + msg));
  }

  @ExceptionHandler(MethodArgumentTypeMismatchException.class)
  public ResponseEntity<?> handleTypeMismatch(
      MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
    log.warn("Parameter type mismatch on {}: {}", request.getRequestURI(), ex.getMessage());
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(buildErrorBody("INVALID_PARAMETER", "Invalid parameter: " + ex.getName()));
  }

  @ExceptionHandler(MissingServletRequestParameterException.class)
  public ResponseEntity<?> handleMissingParam(
      MissingServletRequestParameterException ex, HttpServletRequest request) {
    log.warn("Missing parameter on {}: {}", request.getRequestURI(), ex.getMessage());
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(buildErrorBody("MISSING_PARAMETER", ex.getParameterName() + " is required"));
  }

  @ExceptionHandler(InsufficientBalanceException.class)
  public ResponseEntity<?> handleInsufficientBalance(InsufficientBalanceException ex) {
    log.warn("Insufficient balance: {}", ex.getMessage());
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(buildErrorBody("INSUFFICIENT_BALANCE", ex.getMessage()));
  }

  @ExceptionHandler(IdempotencyConflictException.class)
  public ResponseEntity<?> handleIdempotencyConflict(IdempotencyConflictException ex) {
    log.warn("Idempotency conflict: {}", ex.getMessage());
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(buildErrorBody("IDEMPOTENCY_CONFLICT", ex.getMessage()));
  }

  @ExceptionHandler(SeparationOfDutiesViolationException.class)
  public ResponseEntity<?> handleSeparationOfDuties(SeparationOfDutiesViolationException ex) {
    log.warn("Separation of duties violation: {}", ex.getMessage());
    return ResponseEntity.status(HttpStatus.FORBIDDEN)
        .body(buildErrorBody("SEPARATION_OF_DUTIES_VIOLATION", ex.getMessage()));
  }

  @ExceptionHandler(ResourceNotFoundException.class)
  public ResponseEntity<?> handleNotFound(ResourceNotFoundException ex) {
    log.warn("Resource not found: {}", ex.getMessage());
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(buildErrorBody("RESOURCE_NOT_FOUND", ex.getMessage()));
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<?> handleIllegalArgument(IllegalArgumentException ex) {
    log.warn("Illegal argument: {}", ex.getMessage());
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(buildErrorBody("INVALID_ARGUMENT", ex.getMessage()));
  }

  @ExceptionHandler(IllegalStateException.class)
  public ResponseEntity<?> handleIllegalState(IllegalStateException ex) {
    log.warn("Illegal state: {}", ex.getMessage());
    HttpStatus status =
        ex.getMessage() != null && ex.getMessage().toLowerCase().contains("insufficient")
            ? HttpStatus.UNPROCESSABLE_ENTITY
            : HttpStatus.CONFLICT;
    return ResponseEntity.status(status).body(buildErrorBody("STATE_CONFLICT", ex.getMessage()));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<?> handleGeneral(Exception ex, HttpServletRequest request) {
    log.error("Unhandled exception on {}: {}", request.getRequestURI(), ex.getMessage(), ex);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(
            buildErrorBody(
                "INTERNAL_ERROR", "An unexpected error occurred. Please contact support."));
  }
}
