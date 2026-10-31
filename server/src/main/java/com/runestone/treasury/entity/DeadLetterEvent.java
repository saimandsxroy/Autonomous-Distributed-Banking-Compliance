package com.runestone.treasury.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "dead_letter_events")
public class DeadLetterEvent {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "outbox_event_id")
  private Long outboxEventId;

  @Column(name = "original_topic", nullable = false, length = 128)
  private String originalTopic;

  @Column(name = "event_type", nullable = false, length = 64)
  private String eventType;

  @Column(name = "payload", nullable = false, columnDefinition = "JSON")
  private String payload;

  @Column(name = "failure_reason", nullable = false, columnDefinition = "TEXT")
  private String failureReason;

  @Column(name = "replayed", nullable = false)
  private boolean replayed = false;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt;

  @Column(name = "replayed_at")
  private LocalDateTime replayedAt;

  public DeadLetterEvent() {}

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Long getOutboxEventId() {
    return outboxEventId;
  }

  public void setOutboxEventId(Long outboxEventId) {
    this.outboxEventId = outboxEventId;
  }

  public String getOriginalTopic() {
    return originalTopic;
  }

  public void setOriginalTopic(String originalTopic) {
    this.originalTopic = originalTopic;
  }

  public String getEventType() {
    return eventType;
  }

  public void setEventType(String eventType) {
    this.eventType = eventType;
  }

  public String getPayload() {
    return payload;
  }

  public void setPayload(String payload) {
    this.payload = payload;
  }

  public String getFailureReason() {
    return failureReason;
  }

  public void setFailureReason(String failureReason) {
    this.failureReason = failureReason;
  }

  public boolean isReplayed() {
    return replayed;
  }

  public void setReplayed(boolean replayed) {
    this.replayed = replayed;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public LocalDateTime getReplayedAt() {
    return replayedAt;
  }

  public void setReplayedAt(LocalDateTime replayedAt) {
    this.replayedAt = replayedAt;
  }
}
