package com.runestone.treasury.scheduler;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.runestone.treasury.entity.DeadLetterEvent;
import com.runestone.treasury.entity.OutboxEvent;
import com.runestone.treasury.repository.DeadLetterEventRepository;
import com.runestone.treasury.repository.OutboxEventRepository;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;

@ExtendWith(MockitoExtension.class)
class OutboxRelaySchedulerTests {

  @Mock private OutboxEventRepository outboxEventRepository;

  @Mock private DeadLetterEventRepository deadLetterEventRepository;

  @Mock private KafkaTemplate<String, String> kafkaTemplate;

  @InjectMocks private OutboxRelayScheduler outboxRelayScheduler;

  private OutboxEvent buildPendingEvent(Long id) {
    OutboxEvent ev = new OutboxEvent();
    ev.setId(id);
    ev.setAggregateType("JournalEntry");
    ev.setAggregateId(100L);
    ev.setEventType("transaction.completed");
    ev.setTopic("treasury.transfers.settled");
    ev.setPayload("{\"amount\":\"500\"}");
    ev.setStatus("PENDING");
    ev.setRetryCount(0);
    ev.setNextAttemptAt(LocalDateTime.now().minusSeconds(1));
    ev.setCreatedAt(LocalDateTime.now().minusSeconds(5));
    return ev;
  }

  @Test
  void testSuccessPathMarksPublished() throws Exception {
    OutboxEvent event = buildPendingEvent(1L);
    when(outboxEventRepository.pollPendingEvents(50)).thenReturn(List.of(event));

    @SuppressWarnings("unchecked")
    CompletableFuture<SendResult<String, String>> future =
        CompletableFuture.completedFuture(mock(SendResult.class));
    when(kafkaTemplate.send(anyString(), anyString(), anyString())).thenReturn(future);

    outboxRelayScheduler.relayPendingEvents();

    ArgumentCaptor<OutboxEvent> captor = ArgumentCaptor.forClass(OutboxEvent.class);
    verify(outboxEventRepository).save(captor.capture());
    assertThat(captor.getValue().getStatus()).isEqualTo("PUBLISHED");
    assertThat(captor.getValue().getPublishedAt()).isNotNull();
  }

  @Test
  void testFirstFailureIncrementsRetryCount() {
    OutboxEvent event = buildPendingEvent(2L);
    when(outboxEventRepository.pollPendingEvents(50)).thenReturn(List.of(event));
    when(kafkaTemplate.send(anyString(), anyString(), anyString()))
        .thenThrow(new RuntimeException("Kafka unavailable"));

    outboxRelayScheduler.relayPendingEvents();

    ArgumentCaptor<OutboxEvent> captor = ArgumentCaptor.forClass(OutboxEvent.class);
    verify(outboxEventRepository).save(captor.capture());
    assertThat(captor.getValue().getRetryCount()).isEqualTo(1);
    assertThat(captor.getValue().getStatus()).isEqualTo("PENDING"); // not yet FAILED
    assertThat(captor.getValue().getNextAttemptAt()).isAfter(LocalDateTime.now());
    verify(deadLetterEventRepository, never()).save(any());
  }

  @Test
  void testThirdFailureMovesToDlq() {
    OutboxEvent event = buildPendingEvent(3L);
    event.setRetryCount(2); // Already failed twice — 3rd attempt will trigger DLQ
    when(outboxEventRepository.pollPendingEvents(50)).thenReturn(List.of(event));
    when(kafkaTemplate.send(anyString(), anyString(), anyString()))
        .thenThrow(new RuntimeException("Broker down"));

    outboxRelayScheduler.relayPendingEvents();

    ArgumentCaptor<OutboxEvent> eventCaptor = ArgumentCaptor.forClass(OutboxEvent.class);
    verify(outboxEventRepository).save(eventCaptor.capture());
    assertThat(eventCaptor.getValue().getStatus()).isEqualTo("FAILED");
    assertThat(eventCaptor.getValue().getRetryCount()).isEqualTo(3);

    ArgumentCaptor<DeadLetterEvent> dlqCaptor = ArgumentCaptor.forClass(DeadLetterEvent.class);
    verify(deadLetterEventRepository).save(dlqCaptor.capture());
    assertThat(dlqCaptor.getValue().getEventType()).isEqualTo("transaction.completed");
    assertThat(dlqCaptor.getValue().getOriginalTopic()).isEqualTo("treasury.transfers.settled");
    assertThat(dlqCaptor.getValue().isReplayed()).isFalse();
  }

  @Test
  void testEmptyQueueSkipsProcessing() {
    when(outboxEventRepository.pollPendingEvents(50)).thenReturn(Collections.emptyList());

    outboxRelayScheduler.relayPendingEvents();

    verify(kafkaTemplate, never()).send(anyString(), anyString(), anyString());
    verify(outboxEventRepository, never()).save(any());
  }

  @Test
  void testMultipleEventsMixedResults() throws Exception {
    OutboxEvent success = buildPendingEvent(10L);
    OutboxEvent failure = buildPendingEvent(11L);
    failure.setRetryCount(2); // Will hit DLQ on next failure

    when(outboxEventRepository.pollPendingEvents(50)).thenReturn(Arrays.asList(success, failure));

    @SuppressWarnings("unchecked")
    CompletableFuture<SendResult<String, String>> okFuture =
        CompletableFuture.completedFuture(mock(SendResult.class));

    // First send (success event) succeeds, second (failure event) throws
    when(kafkaTemplate.send(anyString(), anyString(), anyString()))
        .thenReturn(okFuture)
        .thenThrow(new RuntimeException("Broker refused"));

    outboxRelayScheduler.relayPendingEvents();

    // At least two saves: one PUBLISHED, one FAILED
    verify(outboxEventRepository, atLeast(2)).save(any());
    // Failure event reaches DLQ since retryCount starts at 2 and becomes 3
    verify(deadLetterEventRepository, atLeastOnce()).save(any());
  }
}
