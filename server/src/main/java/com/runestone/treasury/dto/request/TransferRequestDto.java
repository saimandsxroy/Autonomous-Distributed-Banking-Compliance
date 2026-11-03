package com.runestone.treasury.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

@JsonIgnoreProperties(ignoreUnknown = true)
public class TransferRequestDto {

  @NotNull(message = "sourceAccountId is required")
  private Long sourceAccountId;

  @NotNull(message = "destinationAccountId is required")
  private Long destinationAccountId;

  @NotNull(message = "amount is required")
  @DecimalMin(value = "0.01", message = "amount must be at least 0.01")
  private BigDecimal amount;

  private String currency = "USD";
  private String targetCurrency;

  @Size(max = 128, message = "idempotencyKey must be at most 128 characters")
  private String idempotencyKey;

  @Size(max = 512, message = "notes must be at most 512 characters")
  private String notes;

  private String referenceType = "TRANSFER";
  private String title;
  private String content;

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
    return currency != null ? currency : "USD";
  }

  public void setCurrency(String currency) {
    this.currency = currency;
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

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }

  public String getReferenceType() {
    return referenceType != null ? referenceType : "TRANSFER";
  }

  public void setReferenceType(String referenceType) {
    this.referenceType = referenceType;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getContent() {
    return content;
  }

  public void setContent(String content) {
    this.content = content;
  }
}
