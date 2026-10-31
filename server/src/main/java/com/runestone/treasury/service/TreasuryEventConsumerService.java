package com.runestone.treasury.service;

import com.runestone.treasury.entity.DeadLetterEvent;
import com.runestone.treasury.repository.DeadLetterEventRepository;
import java.time.LocalDateTime;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class TreasuryEventConsumerService {

  private static final Logger log = LoggerFactory.getLogger(TreasuryEventConsumerService.class);

  @Autowired private DeadLetterEventRepository deadLetterEventRepository;

  @Autowired private GeminiAmlDetectiveService geminiAmlDetectiveService;

  /**
   * Consumes published treasury events from the relay topic. Logs structured audit entries and
   * prepares hooks for Phase 5 Gemini AML Detective integration. Poison-pill payloads are routed to
   * dead_letter_events as QUARANTINED.
   */
  @KafkaListener(
      topics = "runestone.treasury.events",
      groupId = "runestone-treasury-group",
      autoStartup = "${spring.kafka.listener.auto-startup:true}")
  public void consume(ConsumerRecord<String, String> record) {
    try {
      String payload = record.value();
      log.info(
          "Treasury event consumed: topic={}, partition={}, offset={}, key={}",
          record.topic(),
          record.partition(),
          record.offset(),
          record.key());

      if (payload == null || payload.isBlank()) {
        throw new IllegalArgumentException("Received null/blank payload — treating as poison pill");
      }

      String eventType = extractEventType(payload);
      log.info("Processing eventType={} for aggregateKey={}", eventType, record.key());

      if ("transaction.flagged".equalsIgnoreCase(eventType)
          || "BALANCE_HOLD_CREATED".equalsIgnoreCase(eventType)) {
        triggerInvestigationIfApplicable(record.key(), payload);
      }

    } catch (Exception e) {
      log.error(
          "Poison-pill detected on topic={}, offset={}: {}",
          record.topic(),
          record.offset(),
          e.getMessage());
      routeToDlq(record, e);
    }
  }

  private String extractEventType(String payload) {
    try {
      int idx = payload.indexOf("\"eventType\"");
      if (idx == -1) {
        idx = payload.indexOf("\"event_type\"");
      }
      if (idx != -1) {
        int colon = payload.indexOf(":", idx);
        int start = payload.indexOf("\"", colon) + 1;
        int end = payload.indexOf("\"", start);
        if (start > 0 && end > start) {
          return payload.substring(start, end);
        }
      }
    } catch (Exception ignored) {
    }
    return "UNKNOWN";
  }

  /**
   * Consumes settled transfer events from treasury.transfers.settled topic. Logs structured audit
   * entries for Phase 5 Gemini AML Detective integration.
   */
  @KafkaListener(
      topics = "treasury.transfers.settled",
      groupId = "runestone-treasury-group",
      autoStartup = "${spring.kafka.listener.auto-startup:true}")
  public void consumeSettled(ConsumerRecord<String, String> record) {
    try {
      String payload = record.value();
      log.info(
          "Settled transfer event consumed: topic={}, partition={}, offset={}, key={}",
          record.topic(),
          record.partition(),
          record.offset(),
          record.key());

      if (payload == null || payload.isBlank()) {
        throw new IllegalArgumentException("Received null/blank payload — treating as poison pill");
      }

      String eventType = extractEventType(payload);
      log.info("Processing settled eventType={} for aggregateKey={}", eventType, record.key());

    } catch (Exception e) {
      log.error(
          "Poison-pill detected on topic={}, offset={}: {}",
          record.topic(),
          record.offset(),
          e.getMessage());
      routeToDlq(record, e);
    }
  }

  /**
   * Consumes AML-flagged events from treasury.aml.flagged topic. Automatically executes autonomous
   * Gemini AML fraud investigation.
   */
  @KafkaListener(
      topics = "treasury.aml.flagged",
      groupId = "runestone-treasury-group",
      autoStartup = "${spring.kafka.listener.auto-startup:true}")
  public void consumeFlagged(ConsumerRecord<String, String> record) {
    try {
      String payload = record.value();
      log.info(
          "AML flagged event consumed: topic={}, partition={}, offset={}, key={}",
          record.topic(),
          record.partition(),
          record.offset(),
          record.key());

      if (payload == null || payload.isBlank()) {
        throw new IllegalArgumentException("Received null/blank payload — treating as poison pill");
      }

      String eventType = extractEventType(payload);
      log.info("Processing flagged eventType={} for aggregateKey={}", eventType, record.key());

      triggerInvestigationIfApplicable(record.key(), payload);

    } catch (Exception e) {
      log.error(
          "Poison-pill detected on topic={}, offset={}: {}",
          record.topic(),
          record.offset(),
          e.getMessage());
      routeToDlq(record, e);
    }
  }

  private void triggerInvestigationIfApplicable(String key, String payload) {
    Long holdId = null;
    try {
      if (key != null && !key.isBlank()) {
        holdId = Long.parseLong(key.trim());
      }
    } catch (NumberFormatException ignored) {
    }

    if (holdId == null && payload != null) {
      try {
        int idx = payload.indexOf("\"id\":");
        if (idx != -1) {
          int end = payload.indexOf(",", idx);
          if (end == -1) end = payload.indexOf("}", idx);
          String num = payload.substring(idx + 5, end).trim();
          holdId = Long.parseLong(num);
        }
      } catch (Exception ignored) {
      }
    }

    if (holdId != null) {
      log.info("Autonomous Gemini detective triggered for balance hold ID {}", holdId);
      geminiAmlDetectiveService.investigateBalanceHold(holdId);
    }
  }

  private void routeToDlq(ConsumerRecord<String, String> record, Exception cause) {
    try {
      DeadLetterEvent dlq = new DeadLetterEvent();
      dlq.setOriginalTopic(record.topic() != null ? record.topic() : "runestone.treasury.events");
      dlq.setEventType("CONSUMER_POISON_PILL");
      dlq.setPayload(record.value() != null ? record.value() : "null");
      dlq.setFailureReason(
          cause.getMessage() != null ? cause.getMessage() : cause.getClass().getName());
      dlq.setReplayed(false);
      dlq.setCreatedAt(LocalDateTime.now());
      deadLetterEventRepository.save(dlq);
      log.info("Poison-pill routed to DLQ: topic={}, offset={}", record.topic(), record.offset());
    } catch (Exception ex) {
      log.error("Failed to persist poison-pill to DLQ: {}", ex.getMessage());
    }
  }
}
