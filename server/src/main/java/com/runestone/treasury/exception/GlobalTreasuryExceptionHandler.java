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
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

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

  @ExceptionHandler(Exception.class)
  public ResponseEntity<?> handleGeneral(Exception ex, HttpServletRequest request) {
    log.error("Unhandled exception on {}: {}", request.getRequestURI(), ex.getMessage(), ex);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(
            buildErrorBody(
                "INTERNAL_ERROR", "An unexpected error occurred. Please contact support."));
  }
}
