package com.runestone.treasury.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public class FxTransferRequestDto {
  @NotNull(message = "sourceAccountId is required")
  private Long sourceAccountId;

  @NotNull(message = "destinationAccountId is required")
  private Long destinationAccountId;

  @NotNull(message = "amount is required")
  @DecimalMin(value = "0.01", message = "amount must be at least 0.01")
  private BigDecimal amount;

  @NotBlank(message = "sourceCurrency is required")
  private String sourceCurrency;

  @NotBlank(message = "targetCurrency is required")
  private String targetCurrency;

  @NotBlank(message = "idempotencyKey is required")
  @Size(max = 128, message = "idempotencyKey must be at most 128 characters")
  private String idempotencyKey;

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

  public String getSourceCurrency() {
    return sourceCurrency;
  }

  public void setSourceCurrency(String sourceCurrency) {
    this.sourceCurrency = sourceCurrency;
  }

  public String getTargetCurrency() {
    return targetCurrency;
  }

  public void setTargetCurrency(String targetCurrency) {
    this.targetCurrency = targetCurrency;
  }

  public String getIdempotencyKey() {
    return idempotencyKey;
  }

  public void setIdempotencyKey(String idempotencyKey) {
    this.idempotencyKey = idempotencyKey;
  }
}
