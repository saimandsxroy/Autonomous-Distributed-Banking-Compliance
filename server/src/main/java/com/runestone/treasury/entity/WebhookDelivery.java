package com.runestone.treasury.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "webhook_deliveries")
public class WebhookDelivery {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "direction", nullable = false, length = 16)
  private String direction;

  @Column(name = "event_id", nullable = false, unique = true, length = 128)
  private String eventId;

  @Column(name = "event_type", nullable = false, length = 64)
  private String eventType;

  @Column(name = "target_or_source", nullable = false, length = 255)
  private String targetOrSource;

  @Column(name = "signature_header", nullable = false, length = 255)
  private String signatureHeader;

  @Column(name = "payload_json", nullable = false, columnDefinition = "JSON")
  private String payloadJson;

  @Column(name = "verification_or_http_status", nullable = false, length = 64)
  private String verificationOrHttpStatus;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @PrePersist
  public void prePersist() {
    if (createdAt == null) {
      createdAt = LocalDateTime.now();
    }
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getDirection() {
    return direction;
  }

  public void setDirection(String direction) {
    this.direction = direction;
  }

  public String getEventId() {
    return eventId;
  }

  public void setEventId(String eventId) {
    this.eventId = eventId;
  }

  public String getEventType() {
    return eventType;
  }

  public void setEventType(String eventType) {
    this.eventType = eventType;
  }

  public String getTargetOrSource() {
    return targetOrSource;
  }

  public void setTargetOrSource(String targetOrSource) {
    this.targetOrSource = targetOrSource;
  }

  public String getSignatureHeader() {
    return signatureHeader;
  }

  public void setSignatureHeader(String signatureHeader) {
    this.signatureHeader = signatureHeader;
  }

  public String getPayloadJson() {
    return payloadJson;
  }

  public void setPayloadJson(String payloadJson) {
    this.payloadJson = payloadJson;
  }

  public String getVerificationOrHttpStatus() {
    return verificationOrHttpStatus;
  }

  public void setVerificationOrHttpStatus(String verificationOrHttpStatus) {
    this.verificationOrHttpStatus = verificationOrHttpStatus;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }
}
