package com.runestone.treasury.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class MakerCheckerWireRequestDto {

  private String idempotencyKey;

  @NotNull(message = "sourceAccountId is required")
  private Long sourceAccountId;

  @NotNull(message = "destinationAccountId is required")
  private Long destinationAccountId;

  @NotNull(message = "amount is required")
  @DecimalMin(value = "0.01", message = "amount must be greater than zero")
  private BigDecimal amount;

  private String currency = "USD";

  private String description;

  public MakerCheckerWireRequestDto() {}

  public MakerCheckerWireRequestDto(
      String idempotencyKey,
      Long sourceAccountId,
      Long destinationAccountId,
      BigDecimal amount,
      String currency,
      String description) {
    this.idempotencyKey = idempotencyKey;
    this.sourceAccountId = sourceAccountId;
    this.destinationAccountId = destinationAccountId;
    this.amount = amount;
    this.currency = currency != null ? currency : "USD";
    this.description = description;
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

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }
}
