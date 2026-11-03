package com.runestone.treasury.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "reconciliation_runs")
public class ReconciliationRun {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "statement_reference", nullable = false, unique = true, length = 64)
  private String statementReference;

  @Column(name = "total_external_records", nullable = false)
  private int totalExternalRecords;

  @Column(name = "matched_count", nullable = false)
  private int matchedCount;

  @Column(name = "missing_internal_count", nullable = false)
  private int missingInternalCount;

  @Column(name = "missing_external_count", nullable = false)
  private int missingExternalCount;

  @Column(name = "amount_mismatch_count", nullable = false)
  private int amountMismatchCount;

  @Column(name = "status", nullable = false, length = 32)
  private String status;

  @Column(name = "executed_by", nullable = false, length = 100)
  private String executedBy;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

  public ReconciliationRun() {}

  public ReconciliationRun(
      Long id,
      String statementReference,
      int totalExternalRecords,
      int matchedCount,
      int missingInternalCount,
      int missingExternalCount,
      int amountMismatchCount,
      String status,
      String executedBy,
      LocalDateTime createdAt) {
    this.id = id;
    this.statementReference = statementReference;
    this.totalExternalRecords = totalExternalRecords;
    this.matchedCount = matchedCount;
    this.missingInternalCount = missingInternalCount;
    this.missingExternalCount = missingExternalCount;
    this.amountMismatchCount = amountMismatchCount;
    this.status = status;
    this.executedBy = executedBy;
    this.createdAt = createdAt;
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getStatementReference() {
    return statementReference;
  }

  public void setStatementReference(String statementReference) {
    this.statementReference = statementReference;
  }

  public int getTotalExternalRecords() {
    return totalExternalRecords;
  }

  public void setTotalExternalRecords(int totalExternalRecords) {
    this.totalExternalRecords = totalExternalRecords;
  }

  public int getMatchedCount() {
    return matchedCount;
  }

  public void setMatchedCount(int matchedCount) {
    this.matchedCount = matchedCount;
  }

  public int getMissingInternalCount() {
    return missingInternalCount;
  }

  public void setMissingInternalCount(int missingInternalCount) {
    this.missingInternalCount = missingInternalCount;
  }

  public int getMissingExternalCount() {
    return missingExternalCount;
  }

  public void setMissingExternalCount(int missingExternalCount) {
    this.missingExternalCount = missingExternalCount;
  }

  public int getAmountMismatchCount() {
    return amountMismatchCount;
  }

  public void setAmountMismatchCount(int amountMismatchCount) {
    this.amountMismatchCount = amountMismatchCount;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getExecutedBy() {
    return executedBy;
  }

  public void setExecutedBy(String executedBy) {
    this.executedBy = executedBy;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }
}
