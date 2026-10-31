package com.runestone.treasury.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class TransferResponseDto {
  private Long journalId;
  private String status;
  private BigDecimal amount;
  private String currency;
  private String idempotencyKey;
  private LocalDateTime settledAt;
  private String message;

  public Long getJournalId() {
    return journalId;
  }

  public void setJournalId(Long journalId) {
    this.journalId = journalId;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public BigDecimal getAmount() {
    return amount;
  }

  public void setAmount(BigDecimal amount) {
    this.amount = amount;
  }

  public String getCurrency() {
    return currency;
  }

  public void setCurrency(String currency) {
    this.currency = currency;
  }

  public String getIdempotencyKey() {
    return idempotencyKey;
  }

  public void setIdempotencyKey(String idempotencyKey) {
    this.idempotencyKey = idempotencyKey;
  }

  public LocalDateTime getSettledAt() {
    return settledAt;
  }

  public void setSettledAt(LocalDateTime settledAt) {
    this.settledAt = settledAt;
  }

  public String getMessage() {
    return message;
  }

  public void setMessage(String message) {
    this.message = message;
  }
}
