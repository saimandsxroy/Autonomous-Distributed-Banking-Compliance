package com.runestone.treasury.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "compliance_audit_logs")
public class ComplianceAuditLog {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "actor_user_name", nullable = false, length = 100)
  private String actorUserName;

  @Column(name = "action_type", nullable = false, length = 64)
  private String actionType;

  @Column(name = "target_entity_id", nullable = false)
  private Long targetEntityId;

  @Column(name = "payload", nullable = false, columnDefinition = "JSON")
  private String payload;

  @Column(name = "previous_hash", nullable = false, columnDefinition = "CHAR(64)")
  private String previousHash;

  @Column(name = "record_hash", nullable = false, columnDefinition = "CHAR(64)")
  private String recordHash;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  public ComplianceAuditLog() {}

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getActorUserName() {
    return actorUserName;
  }

  public void setActorUserName(String actorUserName) {
    this.actorUserName = actorUserName;
  }

  public String getActionType() {
    return actionType;
  }

  public void setActionType(String actionType) {
    this.actionType = actionType;
  }

  public Long getTargetEntityId() {
    return targetEntityId;
  }

  public void setTargetEntityId(Long targetEntityId) {
    this.targetEntityId = targetEntityId;
  }

  public String getPayload() {
    return payload;
  }

  public void setPayload(String payload) {
    this.payload = payload;
  }

  public String getPreviousHash() {
    return previousHash;
  }

  public void setPreviousHash(String previousHash) {
    this.previousHash = previousHash;
  }

  public String getRecordHash() {
    return recordHash;
  }

  public void setRecordHash(String recordHash) {
    this.recordHash = recordHash;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }
}
