package com.runestone.treasury.scheduler;

import com.runestone.treasury.entity.DeadLetterEvent;
import com.runestone.treasury.entity.OutboxEvent;
import com.runestone.treasury.repository.DeadLetterEventRepository;
import com.runestone.treasury.repository.OutboxEventRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Transactional outbox relay scheduler. Polls PENDING outbox events every 2 seconds using FOR
 * UPDATE SKIP LOCKED to safely handle concurrent scheduler instances. On Kafka publish success,
 * marks the event PUBLISHED. On repeated failure (>= MAX_RETRIES), marks FAILED and quarantines the
 * event to dead_letter_events.
 */
@Component
public class OutboxRelayScheduler {

  private static final Logger log = LoggerFactory.getLogger(OutboxRelayScheduler.class);
  private static final int MAX_RETRIES = 3;

  /** OutboxEventRepository extends OutboxEventRepositoryCustom — provides pollPendingEvents(). */
  @Autowired private OutboxEventRepository outboxEventRepository;

  @Autowired private DeadLetterEventRepository deadLetterEventRepository;

  @Autowired private KafkaTemplate<String, String> kafkaTemplate;

  @Scheduled(fixedDelay = 2000)
  public void relayPendingEvents() {
    List<OutboxEvent> pending = outboxEventRepository.pollPendingEvents(50);
    if (pending.isEmpty()) {
      return;
    }
    log.info("OutboxRelayScheduler: processing {} pending events", pending.size());

    for (OutboxEvent event : pending) {
      try {
        kafkaTemplate
            .send(event.getTopic(), String.valueOf(event.getAggregateId()), event.getPayload())
            .get(3, TimeUnit.SECONDS); // fail fast — 3s timeout per event
        event.setStatus("PUBLISHED");
        event.setPublishedAt(LocalDateTime.now());
        outboxEventRepository.save(event);
        log.info(
            "Outbox event published: id={}, topic={}, eventType={}",
            event.getId(),
            event.getTopic(),
            event.getEventType());
      } catch (Exception e) {
        int retries = event.getRetryCount() + 1;
        event.setRetryCount(retries);
        event.setLastError(e.getMessage() != null ? e.getMessage() : e.getClass().getName());

        if (retries >= MAX_RETRIES) {
          event.setStatus("FAILED");
          quarantineToDeadLetter(event, e);
          log.error(
              "Outbox event moved to DLQ after {} retries: id={}, topic={}",
              retries,
              event.getId(),
              event.getTopic());
        } else {
          // Exponential backoff: 2^retries seconds
          long backoffSeconds = (long) Math.pow(2, retries);
          event.setNextAttemptAt(LocalDateTime.now().plusSeconds(backoffSeconds));
          log.warn(
              "Outbox event retry {}/{}: id={}, backoffSeconds={}",
              retries,
              MAX_RETRIES,
              event.getId(),
              backoffSeconds);
        }
        outboxEventRepository.save(event);
      }
    }
  }

  private void quarantineToDeadLetter(OutboxEvent event, Exception cause) {
    try {
      DeadLetterEvent dlq = new DeadLetterEvent();
      dlq.setOutboxEventId(event.getId());
      dlq.setOriginalTopic(event.getTopic());
      dlq.setEventType(event.getEventType());
      dlq.setPayload(event.getPayload());
      dlq.setFailureReason(
          cause.getMessage() != null ? cause.getMessage() : cause.getClass().getName());
      dlq.setReplayed(false);
      dlq.setCreatedAt(LocalDateTime.now());
      deadLetterEventRepository.save(dlq);
    } catch (Exception ex) {
      log.error(
          "Failed to persist dead letter event for outbox id={}: {}",
          event.getId(),
          ex.getMessage());
    }
  }
}
