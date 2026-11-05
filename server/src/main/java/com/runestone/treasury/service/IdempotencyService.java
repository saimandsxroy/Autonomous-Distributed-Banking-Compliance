package com.runestone.treasury.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.runestone.treasury.entity.IdempotencyRecord;
import com.runestone.treasury.repository.IdempotencyRecordRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IdempotencyService {

  private static final Logger log = LoggerFactory.getLogger(IdempotencyService.class);
  private static final String IN_FLIGHT_VALUE = "IN_FLIGHT";
  private static final long LOCK_TTL_SECONDS = 60L;

  @Autowired private StringRedisTemplate stringRedisTemplate;

  @Autowired private IdempotencyRecordRepository idempotencyRecordRepository;

  @Autowired private ObjectMapper objectMapper;

  /**
   * Returns null if the request is new (should proceed). Returns "IN_FLIGHT" if a concurrent
   * duplicate is in-progress (caller returns 409). Returns "HASH_MISMATCH" if key was used with a
   * different payload (caller returns 422). Returns the cached response JSON prefixed "REPLAY:" if
   * already COMPLETED (caller returns 200).
   */
  public String checkAndLock(String userName, String idempotencyKey, Object requestBody) {
    String redisKey = "idemp:" + userName + ":" + idempotencyKey;

    // Layer 1: Redis fast-path lock (SET NX EX 60)
    Boolean isNew =
        stringRedisTemplate
            .opsForValue()
            .setIfAbsent(redisKey, IN_FLIGHT_VALUE, LOCK_TTL_SECONDS, TimeUnit.SECONDS);

    if (Boolean.FALSE.equals(isNew)) {
      // Key already exists in Redis - concurrent duplicate in-flight
      log.warn("Idempotency key {} in-flight for user {}", idempotencyKey, userName);
      return "IN_FLIGHT";
    }

    // Layer 2: MySQL durable state check
    String requestHash = computeSha256(requestBody);
    Optional<IdempotencyRecord> existing =
        idempotencyRecordRepository.findByUserNameAndIdempotencyKey(userName, idempotencyKey);

    if (existing.isPresent()) {
      IdempotencyRecord record = existing.get();
      if (!record.getRequestHash().equals(requestHash)) {
        log.warn(
            "Idempotency key {} reused with different payload for user {}",
            idempotencyKey,
            userName);
        stringRedisTemplate.delete(redisKey);
        return "HASH_MISMATCH";
      }
      if ("COMPLETED".equals(record.getStatus())) {
        log.info(
            "Replaying completed response for idempotency key {} user {}",
            idempotencyKey,
            userName);
        stringRedisTemplate.delete(redisKey);
        return "REPLAY:" + record.getResponseBody();
      }
    }

    return null; // New request - proceed
  }

  @Transactional
  public void markStarted(String userName, String idempotencyKey, Object requestBody) {
    String requestHash = computeSha256(requestBody);
    Optional<IdempotencyRecord> existing =
        idempotencyRecordRepository.findByUserNameAndIdempotencyKey(userName, idempotencyKey);
    if (existing.isEmpty()) {
      IdempotencyRecord record = new IdempotencyRecord();
      record.setUserName(userName);
      record.setIdempotencyKey(idempotencyKey);
      record.setRequestHash(requestHash);
      record.setStatus("STARTED");
      record.setCreatedAt(LocalDateTime.now());
      idempotencyRecordRepository.save(record);
    }
  }

  @Transactional
  public void markCompleted(
      String userName, String idempotencyKey, int httpStatus, Object responseBody) {
    try {
      String responseJson = objectMapper.writeValueAsString(responseBody);
      Optional<IdempotencyRecord> opt =
          idempotencyRecordRepository.findByUserNameAndIdempotencyKey(userName, idempotencyKey);
      if (opt.isPresent()) {
        IdempotencyRecord record = opt.get();
        record.setStatus("COMPLETED");
        record.setHttpStatus(httpStatus);
        record.setResponseBody(responseJson);
        idempotencyRecordRepository.save(record);
      }
    } catch (Exception e) {
      log.error("Failed to mark idempotency record completed: {}", e.getMessage());
    } finally {
      String redisKey = "idemp:" + userName + ":" + idempotencyKey;
      stringRedisTemplate.delete(redisKey);
    }
  }

  public void releaseLock(String userName, String idempotencyKey) {
    String redisKey = "idemp:" + userName + ":" + idempotencyKey;
    stringRedisTemplate.delete(redisKey);
  }

  private Boolean safeRedisSetIfAbsent(String key, String value, long timeout, TimeUnit unit) {
    try {
      if (stringRedisTemplate != null) {
        return stringRedisTemplate.opsForValue().setIfAbsent(key, value, timeout, unit);
      }
    } catch (Exception ex) {
      log.warn(
          "Redis unavailable for idempotency lock, failing open to MySQL durable records: {}",
          ex.getMessage());
    }
    return Boolean.TRUE;
  }

  private void safeRedisDelete(String key) {
    try {
      if (stringRedisTemplate != null) {
        stringRedisTemplate.delete(key);
      }
    } catch (Exception ex) {
      log.warn("Redis delete failed for key {}: {}", key, ex.getMessage());
    }
  }

  private String computeSha256(Object obj) {
    try {
      if (obj instanceof com.runestone.treasury.entity.JournalEntry je) {
        String normalized =
            "source="
                + je.getSourceAccountId()
                + "|dest="
                + je.getDestinationAccountId()
                + "|amount="
                + (je.getAmount() != null
                    ? je.getAmount().stripTrailingZeros().toPlainString()
                    : "0")
                + "|currency="
                + (je.getCurrency() != null ? je.getCurrency() : "USD")
                + "|idemp="
                + (je.getIdempotencyKey() != null ? je.getIdempotencyKey() : "");
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(normalized.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash);
      }
      String json = objectMapper.writeValueAsString(obj);
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(json.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(hash);
    } catch (Exception e) {
      throw new RuntimeException("SHA-256 computation failed", e);
    }
  }
}
