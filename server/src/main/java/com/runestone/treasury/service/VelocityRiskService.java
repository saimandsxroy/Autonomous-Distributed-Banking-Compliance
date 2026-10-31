package com.runestone.treasury.service;

import com.runestone.treasury.cache.AppCache;
import com.runestone.treasury.entity.JournalEntry;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.scripting.support.ResourceScriptSource;
import org.springframework.stereotype.Service;

@Service
public class VelocityRiskService {

  private static final Logger log = LoggerFactory.getLogger(VelocityRiskService.class);

  @Autowired private StringRedisTemplate stringRedisTemplate;

  @Autowired private AppCache appCache;

  /**
   * Evaluates the transfer risk using Redis Lua sliding-window velocity scoring. Returns null if
   * the transfer is safe. Returns a non-null risk reason String if the transfer should be placed
   * into PENDING_HOLD.
   */
  public String evaluateTransferRisk(JournalEntry entry) {
    try {
      BigDecimal amount = entry.getAmount();
      Long sourceAccountId = entry.getSourceAccountId();

      // Check high-value threshold from AppCache
      String highValueThreshold = appCache.get(AppCache.Keys.HIGH_VALUE_HOLD_THRESHOLD.name());
      if (highValueThreshold != null) {
        BigDecimal threshold = new BigDecimal(highValueThreshold);
        if (amount.compareTo(threshold) >= 0) {
          String reason = "HIGH_VALUE_TRANSFER: amount=" + amount + " >= threshold=" + threshold;
          log.warn("High-value transfer flagged for account {}: {}", sourceAccountId, reason);
          return reason;
        }
      }

      // Execute Redis Lua sliding-window velocity check (2-minute window)
      String maxTxStr = appCache.get(AppCache.Keys.VELOCITY_MAX_TX_2M.name());
      int maxTx = maxTxStr != null ? Integer.parseInt(maxTxStr.trim()) : 5;

      DefaultRedisScript<List> script = new DefaultRedisScript<>();
      script.setScriptSource(
          new ResourceScriptSource(new ClassPathResource("redis/transfer_velocity_window.lua")));
      script.setResultType(List.class);

      String velocityKey = "velocity:" + sourceAccountId + ":2m";
      long nowMs = System.currentTimeMillis();

      @SuppressWarnings("unchecked")
      List<Object> result =
          (List<Object>)
              stringRedisTemplate.execute(
                  script,
                  Collections.singletonList(velocityKey),
                  String.valueOf(nowMs),
                  "120000",
                  String.valueOf(maxTx),
                  amount.toPlainString());

      if (result != null && !result.isEmpty()) {
        long txCount = ((Number) result.get(0)).longValue();
        if (txCount > maxTx) {
          String reason =
              "VELOCITY_LIMIT_EXCEEDED: txCount="
                  + txCount
                  + " > maxAllowed="
                  + maxTx
                  + " in 2m window";
          log.warn("Velocity limit exceeded for account {}: {}", sourceAccountId, reason);
          return reason;
        }
      }

      log.debug("Transfer risk check passed for account {}, amount={}", sourceAccountId, amount);
      return null;
    } catch (Exception e) {
      log.error(
          "Velocity risk evaluation failed for account {}: {}",
          entry.getSourceAccountId(),
          e.getMessage());
      // Fail-open: do not block the transfer if Redis is unavailable
      return null;
    }
  }
}
