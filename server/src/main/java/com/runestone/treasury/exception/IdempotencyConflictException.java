package com.runestone.treasury.exception;

public class IdempotencyConflictException extends RuntimeException {
  public IdempotencyConflictException(String message) {
    super(message);
  }
}
