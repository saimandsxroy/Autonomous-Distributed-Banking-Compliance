package com.runestone.treasury.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.runestone.treasury.entity.IdempotencyRecord;
import com.runestone.treasury.entity.JournalEntry;
import com.runestone.treasury.repository.IdempotencyRecordRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
class IdempotencyServiceTests {

  @Mock private StringRedisTemplate stringRedisTemplate;

  @Mock private IdempotencyRecordRepository idempotencyRecordRepository;

  @Mock private ObjectMapper objectMapper;

  @Mock private ValueOperations<String, String> valueOps;

  @InjectMocks private IdempotencyService idempotencyService;

  private JournalEntry sampleEntry;

  @BeforeEach
  void setUp() {
    sampleEntry = new JournalEntry();
    sampleEntry.setSourceAccountId(1L);
    sampleEntry.setDestinationAccountId(2L);
    sampleEntry.setAmount(new BigDecimal("500.00"));
    sampleEntry.setCurrency("USD");
    sampleEntry.setIdempotencyKey("key-abc-123");

    when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);
  }

  @Test
  void testNewRequestReturnsNull() {
    when(valueOps.setIfAbsent(anyString(), anyString(), anyLong(), any(TimeUnit.class)))
        .thenReturn(Boolean.TRUE);
    when(idempotencyRecordRepository.findByUserNameAndIdempotencyKey(anyString(), anyString()))
        .thenReturn(Optional.empty());

    String result = idempotencyService.checkAndLock("alice", "key-abc-123", sampleEntry);
    assertThat(result).isNull();
  }

  @Test
  void testInFlightReturns409Signal() {
    when(valueOps.setIfAbsent(anyString(), anyString(), anyLong(), any(TimeUnit.class)))
        .thenReturn(Boolean.FALSE);

    String result = idempotencyService.checkAndLock("alice", "key-abc-123", sampleEntry);
    assertThat(result).isEqualTo("IN_FLIGHT");
  }

  @Test
  void testHashMismatchReturns422Signal() {
    when(valueOps.setIfAbsent(anyString(), anyString(), anyLong(), any(TimeUnit.class)))
        .thenReturn(Boolean.TRUE);

    // Build a record with a DIFFERENT hash to simulate mismatch
    IdempotencyRecord record = new IdempotencyRecord();
    record.setUserName("alice");
    record.setIdempotencyKey("key-abc-123");
    record.setRequestHash("0000000000000000000000000000000000000000000000000000000000000000");
    record.setStatus("STARTED");
    record.setCreatedAt(LocalDateTime.now());

    when(idempotencyRecordRepository.findByUserNameAndIdempotencyKey("alice", "key-abc-123"))
        .thenReturn(Optional.of(record));

    String result = idempotencyService.checkAndLock("alice", "key-abc-123", sampleEntry);
    // The real hash won't be all zeros, so it's a mismatch
    assertThat(result).isEqualTo("HASH_MISMATCH");
    verify(stringRedisTemplate).delete(anyString());
  }

  @Test
  void testCompletedRecordReturnsReplaySignal() throws Exception {
    when(valueOps.setIfAbsent(anyString(), anyString(), anyLong(), any(TimeUnit.class)))
        .thenReturn(Boolean.TRUE);

    // Compute the real hash that IdempotencyService would compute for this entry
    String normalized =
        "source="
            + sampleEntry.getSourceAccountId()
            + "|dest="
            + sampleEntry.getDestinationAccountId()
            + "|amount="
            + sampleEntry.getAmount().stripTrailingZeros().toPlainString()
            + "|currency="
            + sampleEntry.getCurrency()
            + "|idemp="
            + sampleEntry.getIdempotencyKey();
    java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
    byte[] hashBytes = digest.digest(normalized.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    String expectedHash = java.util.HexFormat.of().formatHex(hashBytes);

    IdempotencyRecord record = new IdempotencyRecord();
    record.setUserName("alice");
    record.setIdempotencyKey("key-abc-123");
    record.setRequestHash(expectedHash);
    record.setStatus("COMPLETED");
    record.setResponseBody("{\"status\":\"ok\"}");
    record.setCreatedAt(LocalDateTime.now());

    when(idempotencyRecordRepository.findByUserNameAndIdempotencyKey("alice", "key-abc-123"))
        .thenReturn(Optional.of(record));

    String result = idempotencyService.checkAndLock("alice", "key-abc-123", sampleEntry);
    assertThat(result).startsWith("REPLAY:");
    assertThat(result).contains("{\"status\":\"ok\"}");
  }

  @Test
  void testMarkStartedPersistsRecord() {
    when(idempotencyRecordRepository.findByUserNameAndIdempotencyKey("alice", "key-abc-123"))
        .thenReturn(Optional.empty());

    idempotencyService.markStarted("alice", "key-abc-123", sampleEntry);

    verify(idempotencyRecordRepository).save(argThat(r -> "STARTED".equals(r.getStatus())));
  }

  @Test
  void testMarkCompletedUpdatesAndReleasesLock() throws Exception {
    when(objectMapper.writeValueAsString(any())).thenReturn("{\"result\":\"done\"}");

    IdempotencyRecord record = new IdempotencyRecord();
    record.setUserName("alice");
    record.setIdempotencyKey("key-abc-123");
    record.setRequestHash("abc");
    record.setStatus("STARTED");
    record.setCreatedAt(LocalDateTime.now());

    when(idempotencyRecordRepository.findByUserNameAndIdempotencyKey("alice", "key-abc-123"))
        .thenReturn(Optional.of(record));

    idempotencyService.markCompleted("alice", "key-abc-123", 200, new Object());

    verify(idempotencyRecordRepository).save(argThat(r -> "COMPLETED".equals(r.getStatus())));
    verify(stringRedisTemplate).delete(anyString());
  }
}
