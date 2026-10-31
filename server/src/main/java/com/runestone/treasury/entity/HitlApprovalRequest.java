package com.runestone.treasury.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "hitl_approval_requests")
public class HitlApprovalRequest {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "investigation_id", nullable = false)
  private Long investigationId;

  @Column(name = "balance_hold_id", nullable = false)
  private Long balanceHoldId;

  @Column(name = "proposed_tool_name", nullable = false, length = 64)
  private String proposedToolName;

  @Column(name = "proposed_arguments_json", nullable = false, columnDefinition = "JSON")
  private String proposedArgumentsJson;

  @Column(name = "ai_rationale", nullable = false, columnDefinition = "TEXT")
  private String aiRationale;

  @Column(name = "status", nullable = false, length = 24)
  private String status = "PENDING_APPROVAL";

  @Column(name = "reviewer_user_name", length = 100)
  private String reviewerUserName;

  @Column(name = "reviewer_notes", length = 512)
  private String reviewerNotes;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

  @Column(name = "resolved_at")
  private LocalDateTime resolvedAt;

  public HitlApprovalRequest() {}

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Long getInvestigationId() {
    return investigationId;
  }

  public void setInvestigationId(Long investigationId) {
    this.investigationId = investigationId;
  }

  public Long getBalanceHoldId() {
    return balanceHoldId;
  }

  public void setBalanceHoldId(Long balanceHoldId) {
    this.balanceHoldId = balanceHoldId;
  }

  public String getProposedToolName() {
    return proposedToolName;
  }

  public void setProposedToolName(String proposedToolName) {
    this.proposedToolName = proposedToolName;
  }

  public String getProposedArgumentsJson() {
    return proposedArgumentsJson;
  }

  public void setProposedArgumentsJson(String proposedArgumentsJson) {
    this.proposedArgumentsJson = proposedArgumentsJson;
  }

  public String getAiRationale() {
    return aiRationale;
  }

  public void setAiRationale(String aiRationale) {
    this.aiRationale = aiRationale;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getReviewerUserName() {
    return reviewerUserName;
  }

  public void setReviewerUserName(String reviewerUserName) {
    this.reviewerUserName = reviewerUserName;
  }

  public String getReviewerNotes() {
    return reviewerNotes;
  }

  public void setReviewerNotes(String reviewerNotes) {
    this.reviewerNotes = reviewerNotes;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public LocalDateTime getResolvedAt() {
    return resolvedAt;
  }

  public void setResolvedAt(LocalDateTime resolvedAt) {
    this.resolvedAt = resolvedAt;
  }
}
