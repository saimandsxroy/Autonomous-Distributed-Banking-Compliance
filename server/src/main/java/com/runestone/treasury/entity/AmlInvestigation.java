package com.runestone.treasury.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "aml_investigations")
public class AmlInvestigation {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "balance_hold_id", nullable = false, unique = true)
  private Long balanceHoldId;

  @Column(name = "source_account_id", nullable = false)
  private Long sourceAccountId;

  @Column(name = "destination_account_id", nullable = false)
  private Long destinationAccountId;

  @Column(name = "risk_score", nullable = false)
  private Integer riskScore;

  @Column(name = "risk_severity", nullable = false, length = 24)
  private String riskSeverity;

  @Column(name = "executive_summary", nullable = false, columnDefinition = "TEXT")
  private String executiveSummary;

  @Column(name = "cited_policy_codes", length = 512)
  private String citedPolicyCodes;

  @Column(name = "subgraph_snapshot_json", columnDefinition = "JSON")
  private String subgraphSnapshotJson;

  @Column(name = "recommended_tool", nullable = false, length = 64)
  private String recommendedTool;

  @Column(name = "status", nullable = false, length = 32)
  private String status = "AWAITING_HITL_APPROVAL";

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

  public AmlInvestigation() {}

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Long getBalanceHoldId() {
    return balanceHoldId;
  }

  public void setBalanceHoldId(Long balanceHoldId) {
    this.balanceHoldId = balanceHoldId;
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

  public Integer getRiskScore() {
    return riskScore;
  }

  public void setRiskScore(Integer riskScore) {
    this.riskScore = riskScore;
  }

  public String getRiskSeverity() {
    return riskSeverity;
  }

  public void setRiskSeverity(String riskSeverity) {
    this.riskSeverity = riskSeverity;
  }

  public String getExecutiveSummary() {
    return executiveSummary;
  }

  public void setExecutiveSummary(String executiveSummary) {
    this.executiveSummary = executiveSummary;
  }

  public String getCitedPolicyCodes() {
    return citedPolicyCodes;
  }

  public void setCitedPolicyCodes(String citedPolicyCodes) {
    this.citedPolicyCodes = citedPolicyCodes;
  }

  public String getSubgraphSnapshotJson() {
    return subgraphSnapshotJson;
  }

  public void setSubgraphSnapshotJson(String subgraphSnapshotJson) {
    this.subgraphSnapshotJson = subgraphSnapshotJson;
  }

  public String getRecommendedTool() {
    return recommendedTool;
  }

  public void setRecommendedTool(String recommendedTool) {
    this.recommendedTool = recommendedTool;
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
}
