package com.runestone.treasury.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "settlement_batch_items")
public class SettlementBatchItem {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "batch_id", nullable = false)
  private Long batchId;

  @Column(name = "`row_number`", nullable = false)
  private Integer rowNumber;

  @Column(name = "destination_account_id", nullable = false)
  private Long destinationAccountId;

  @Column(name = "amount", nullable = false, precision = 19, scale = 4)
  private BigDecimal amount;

  @Column(name = "currency", nullable = false, length = 3)
  private String currency = "USD";

  @Column(name = "description")
  private String description;

  @Column(name = "idempotency_key", nullable = false, unique = true, length = 128)
  private String idempotencyKey;

  @Column(name = "outcome_status", nullable = false, length = 32)
  private String outcomeStatus;

  @Column(name = "journal_entry_id")
  private Long journalEntryId;

  @Column(name = "failure_or_hold_reason", length = 512)
  private String failureOrHoldReason;

  @Column(name = "processed_at", nullable = false)
  private LocalDateTime processedAt = LocalDateTime.now();

  public SettlementBatchItem() {}

  public SettlementBatchItem(
      Long batchId,
      Integer rowNumber,
      Long destinationAccountId,
      BigDecimal amount,
      String currency,
      String description,
      String idempotencyKey,
      String outcomeStatus) {
    this.batchId = batchId;
    this.rowNumber = rowNumber;
    this.destinationAccountId = destinationAccountId;
    this.amount = amount;
    this.currency = currency != null ? currency : "USD";
    this.description = description;
    this.idempotencyKey = idempotencyKey;
    this.outcomeStatus = outcomeStatus;
    this.processedAt = LocalDateTime.now();
  }

  @PrePersist
  public void onPrePersist() {
    if (this.processedAt == null) {
      this.processedAt = LocalDateTime.now();
    }
    if (this.currency == null) {
      this.currency = "USD";
    }
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Long getBatchId() {
    return batchId;
  }

  public void setBatchId(Long batchId) {
    this.batchId = batchId;
  }

  public Integer getRowNumber() {
    return rowNumber;
  }

  public void setRowNumber(Integer rowNumber) {
    this.rowNumber = rowNumber;
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

  public String getIdempotencyKey() {
    return idempotencyKey;
  }

  public void setIdempotencyKey(String idempotencyKey) {
    this.idempotencyKey = idempotencyKey;
  }

  public String getOutcomeStatus() {
    return outcomeStatus;
  }

  public void setOutcomeStatus(String outcomeStatus) {
    this.outcomeStatus = outcomeStatus;
  }

  public Long getJournalEntryId() {
    return journalEntryId;
  }

  public void setJournalEntryId(Long journalEntryId) {
    this.journalEntryId = journalEntryId;
  }

  public String getFailureOrHoldReason() {
    return failureOrHoldReason;
  }

  public void setFailureOrHoldReason(String failureOrHoldReason) {
    this.failureOrHoldReason = failureOrHoldReason;
  }

  public LocalDateTime getProcessedAt() {
    return processedAt;
  }

  public void setProcessedAt(LocalDateTime processedAt) {
    this.processedAt = processedAt;
  }
}
