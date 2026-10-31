package com.runestone.treasury.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "mcp_tool_invocations")
public class McpToolInvocation {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "investigation_id", nullable = false)
  private Long investigationId;

  @Column(name = "tool_name", nullable = false, length = 64)
  private String toolName;

  @Column(name = "permission_tier", nullable = false, length = 16)
  private String permissionTier;

  @Column(name = "arguments_json", nullable = false, columnDefinition = "JSON")
  private String argumentsJson;

  @Column(name = "output_json", columnDefinition = "JSON")
  private String outputJson;

  @Column(name = "execution_status", nullable = false, length = 24)
  private String executionStatus;

  @Column(name = "executed_at", nullable = false)
  private LocalDateTime executedAt = LocalDateTime.now();

  public McpToolInvocation() {}

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

  public String getToolName() {
    return toolName;
  }

  public void setToolName(String toolName) {
    this.toolName = toolName;
  }

  public String getPermissionTier() {
    return permissionTier;
  }

  public void setPermissionTier(String permissionTier) {
    this.permissionTier = permissionTier;
  }

  public String getArgumentsJson() {
    return argumentsJson;
  }

  public void setArgumentsJson(String argumentsJson) {
    this.argumentsJson = argumentsJson;
  }

  public String getOutputJson() {
    return outputJson;
  }

  public void setOutputJson(String outputJson) {
    this.outputJson = outputJson;
  }

  public String getExecutionStatus() {
    return executionStatus;
  }

  public void setExecutionStatus(String executionStatus) {
    this.executionStatus = executionStatus;
  }

  public LocalDateTime getExecutedAt() {
    return executedAt;
  }

  public void setExecutedAt(LocalDateTime executedAt) {
    this.executedAt = executedAt;
  }
}
