package com.runestone.treasury.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.runestone.treasury.entity.OutboxEvent;
import com.runestone.treasury.repository.OutboxEventRepository;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OutboxEventService {

  private static final Logger log = LoggerFactory.getLogger(OutboxEventService.class);

  @Autowired private OutboxEventRepository outboxEventRepository;

  @Autowired private ObjectMapper objectMapper;

  @Transactional
  public OutboxEvent recordEvent(
      String aggregateType, Long aggregateId, String eventType, Object payload) {
    try {
      String payloadJson = objectMapper.writeValueAsString(payload);
      String topic = resolveTopic(eventType);

      OutboxEvent event = new OutboxEvent();
      event.setAggregateType(aggregateType);
      event.setAggregateId(aggregateId);
      event.setEventType(eventType);
      event.setTopic(topic);
      event.setPayload(payloadJson);
      event.setStatus("PENDING");
      event.setRetryCount(0);
      event.setNextAttemptAt(LocalDateTime.now());
      event.setCreatedAt(LocalDateTime.now());

      OutboxEvent saved = outboxEventRepository.save(event);
      log.info(
          "Outbox event recorded: type={}, aggregateId={}, topic={}",
          eventType,
          aggregateId,
          topic);
      return saved;
    } catch (Exception e) {
      log.error("Failed to record outbox event: {}", e.getMessage());
      throw new RuntimeException("Failed to serialize outbox event payload", e);
    }
  }

  private String resolveTopic(String eventType) {
    return switch (eventType) {
      case "transaction.completed" -> "treasury.transfers.settled";
      case "transaction.flagged" -> "treasury.aml.flagged";
      case "BALANCE_HOLD_CREATED" -> "treasury.aml.flagged";
      case "JOURNAL_ENTRY_SETTLED" -> "treasury.transfers.settled";
      case "statement.requested" -> "treasury.statements.requested";
      default -> "runestone.treasury.events";
    };
  }
}
