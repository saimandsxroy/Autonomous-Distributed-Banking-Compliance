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
@Table(name = "settlement_batches")
public class SettlementBatch {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "batch_reference", nullable = false, unique = true, length = 64)
  private String batchReference;

  @Column(name = "uploaded_by_user", nullable = false, length = 100)
  private String uploadedByUser;

  @Column(name = "file_name", nullable = false, length = 255)
  private String fileName;

  @Column(name = "file_sha256_hash", nullable = false, unique = true, length = 64)
  private String fileSha256Hash;

  @Column(name = "source_account_id", nullable = false)
  private Long sourceAccountId;

  @Column(name = "total_rows", nullable = false)
  private Integer totalRows = 0;

  @Column(name = "settled_count", nullable = false)
  private Integer settledCount = 0;

  @Column(name = "held_aml_count", nullable = false)
  private Integer heldAmlCount = 0;

  @Column(name = "failed_count", nullable = false)
  private Integer failedCount = 0;

  @Column(name = "total_settled_amount", nullable = false, precision = 19, scale = 4)
  private BigDecimal totalSettledAmount = BigDecimal.ZERO;

  @Column(name = "status", nullable = false, length = 32)
  private String status = "PROCESSING";

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

  @Column(name = "completed_at")
  private LocalDateTime completedAt;

  public SettlementBatch() {}

  public SettlementBatch(
      String batchReference,
      String uploadedByUser,
      String fileName,
      String fileSha256Hash,
      Long sourceAccountId,
      Integer totalRows) {
    this.batchReference = batchReference;
    this.uploadedByUser = uploadedByUser;
    this.fileName = fileName;
    this.fileSha256Hash = fileSha256Hash;
    this.sourceAccountId = sourceAccountId;
    this.totalRows = totalRows;
    this.settledCount = 0;
    this.heldAmlCount = 0;
    this.failedCount = 0;
    this.totalSettledAmount = BigDecimal.ZERO;
    this.status = "PROCESSING";
    this.createdAt = LocalDateTime.now();
  }

  @PrePersist
  public void onPrePersist() {
    if (this.createdAt == null) {
      this.createdAt = LocalDateTime.now();
    }
    if (this.settledCount == null) {
      this.settledCount = 0;
    }
    if (this.heldAmlCount == null) {
      this.heldAmlCount = 0;
    }
    if (this.failedCount == null) {
      this.failedCount = 0;
    }
    if (this.totalSettledAmount == null) {
      this.totalSettledAmount = BigDecimal.ZERO;
    }
    if (this.status == null) {
      this.status = "PROCESSING";
    }
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getBatchReference() {
    return batchReference;
  }

  public void setBatchReference(String batchReference) {
    this.batchReference = batchReference;
  }

  public String getUploadedByUser() {
    return uploadedByUser;
  }

  public void setUploadedByUser(String uploadedByUser) {
    this.uploadedByUser = uploadedByUser;
  }

  public String getFileName() {
    return fileName;
  }

  public void setFileName(String fileName) {
    this.fileName = fileName;
  }

  public String getFileSha256Hash() {
    return fileSha256Hash;
  }

  public void setFileSha256Hash(String fileSha256Hash) {
    this.fileSha256Hash = fileSha256Hash;
  }

  public Long getSourceAccountId() {
    return sourceAccountId;
  }

  public void setSourceAccountId(Long sourceAccountId) {
    this.sourceAccountId = sourceAccountId;
  }

  public Integer getTotalRows() {
    return totalRows;
  }

  public void setTotalRows(Integer totalRows) {
    this.totalRows = totalRows;
  }

  public Integer getSettledCount() {
    return settledCount;
  }

  public void setSettledCount(Integer settledCount) {
    this.settledCount = settledCount;
  }

  public Integer getHeldAmlCount() {
    return heldAmlCount;
  }

  public void setHeldAmlCount(Integer heldAmlCount) {
    this.heldAmlCount = heldAmlCount;
  }

  public Integer getFailedCount() {
    return failedCount;
  }

  public void setFailedCount(Integer failedCount) {
    this.failedCount = failedCount;
  }

  public BigDecimal getTotalSettledAmount() {
    return totalSettledAmount;
  }

  public void setTotalSettledAmount(BigDecimal totalSettledAmount) {
    this.totalSettledAmount = totalSettledAmount;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public LocalDateTime getCompletedAt() {
    return completedAt;
  }

  public void setCompletedAt(LocalDateTime completedAt) {
    this.completedAt = completedAt;
  }
}
