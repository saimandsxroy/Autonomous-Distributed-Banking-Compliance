package com.runestone.treasury.dto.request;

import java.math.BigDecimal;

public class EodStatementLineDto {

  private String idempotencyKey;
  private Long sourceAccountId;
  private Long destinationAccountId;
  private BigDecimal amount;
  private String currency = "USD";

  public EodStatementLineDto() {}

  public EodStatementLineDto(
      String idempotencyKey,
      Long sourceAccountId,
      Long destinationAccountId,
      BigDecimal amount,
      String currency) {
    this.idempotencyKey = idempotencyKey;
    this.sourceAccountId = sourceAccountId;
    this.destinationAccountId = destinationAccountId;
    this.amount = amount;
    this.currency = currency != null ? currency : "USD";
  }

  public String getIdempotencyKey() {
    return idempotencyKey;
  }

  public void setIdempotencyKey(String idempotencyKey) {
    this.idempotencyKey = idempotencyKey;
  }

  public Long getSourceAccountId() {
    return sourceAccountId;
  }

  public void setSourceAccountId(Long sourceAccountId) {
    this.sourceAccountId = sourceAccountId;
  }

  public Long getDestinationAccountId() {
    return destinationAccountId;
  }

  public void setDestinationAccountId(Long destinationAccountId) {
    this.destinationAccountId = destinationAccountId;
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
}
