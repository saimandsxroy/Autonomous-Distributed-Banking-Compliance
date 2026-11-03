package com.runestone.treasury.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "reconciliation_discrepancies")
public class ReconciliationDiscrepancy {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "run_id", nullable = false)
  private Long runId;

  @Column(name = "idempotency_key", nullable = false, length = 128)
  private String idempotencyKey;

  @Column(name = "source_account_id")
  private Long sourceAccountId;

  @Column(name = "destination_account_id")
  private Long destinationAccountId;

  @Column(name = "discrepancy_type", nullable = false, length = 32)
  private String discrepancyType;

  @Column(name = "external_amount", precision = 19, scale = 4)
  private BigDecimal externalAmount;

  @Column(name = "internal_amount", precision = 19, scale = 4)
  private BigDecimal internalAmount;

  @Column(name = "currency", nullable = false, length = 16)
  private String currency = "USD";

  @Column(name = "resolution_status", nullable = false, length = 32)
  private String resolutionStatus = "OPEN";

  @Column(name = "compensating_journal_id")
  private Long compensatingJournalId;

  @Column(name = "resolved_by", length = 100)
  private String resolvedBy;

  @Column(name = "resolution_notes", length = 512)
  private String resolutionNotes;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

  public ReconciliationDiscrepancy() {}

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Long getRunId() {
    return runId;
  }

  public void setRunId(Long runId) {
    this.runId = runId;
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

  public String getDiscrepancyType() {
    return discrepancyType;
  }

  public void setDiscrepancyType(String discrepancyType) {
    this.discrepancyType = discrepancyType;
  }

  public BigDecimal getExternalAmount() {
    return externalAmount;
  }

  public void setExternalAmount(BigDecimal externalAmount) {
    this.externalAmount = externalAmount;
  }

  public BigDecimal getInternalAmount() {
    return internalAmount;
  }

  public void setInternalAmount(BigDecimal internalAmount) {
    this.internalAmount = internalAmount;
  }

  public String getCurrency() {
    return currency;
  }

  public void setCurrency(String currency) {
    this.currency = currency;
  }

  public String getResolutionStatus() {
    return resolutionStatus;
  }

  public void setResolutionStatus(String resolutionStatus) {
    this.resolutionStatus = resolutionStatus;
  }

  public Long getCompensatingJournalId() {
    return compensatingJournalId;
  }

  public void setCompensatingJournalId(Long compensatingJournalId) {
    this.compensatingJournalId = compensatingJournalId;
  }

  public String getResolvedBy() {
    return resolvedBy;
  }

  public void setResolvedBy(String resolvedBy) {
    this.resolvedBy = resolvedBy;
  }

  public String getResolutionNotes() {
    return resolutionNotes;
  }

  public void setResolutionNotes(String resolutionNotes) {
    this.resolutionNotes = resolutionNotes;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }
}
