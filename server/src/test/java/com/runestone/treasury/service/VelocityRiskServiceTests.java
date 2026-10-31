package com.runestone.treasury.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.runestone.treasury.cache.AppCache;
import com.runestone.treasury.entity.JournalEntry;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;

@ExtendWith(MockitoExtension.class)
class VelocityRiskServiceTests {

  @Mock private StringRedisTemplate stringRedisTemplate;

  @Mock private AppCache appCache;

  @InjectMocks private VelocityRiskService velocityRiskService;

  private JournalEntry sampleEntry;

  @BeforeEach
  void setUp() {
    sampleEntry = new JournalEntry();
    sampleEntry.setSourceAccountId(10L);
    sampleEntry.setDestinationAccountId(20L);
    sampleEntry.setCurrency("USD");
  }

  @Test
  void testHighValueTransferFlagged() {
    sampleEntry.setAmount(new BigDecimal("15000.00"));
    when(appCache.get(AppCache.Keys.HIGH_VALUE_HOLD_THRESHOLD.name())).thenReturn("10000");

    String result = velocityRiskService.evaluateTransferRisk(sampleEntry);

    assertThat(result).isNotNull();
    assertThat(result).contains("HIGH_VALUE_TRANSFER");
  }

  @Test
  void testVelocityLimitExceededFlagged() {
    sampleEntry.setAmount(new BigDecimal("100.00"));
    // High-value threshold not exceeded
    when(appCache.get(AppCache.Keys.HIGH_VALUE_HOLD_THRESHOLD.name())).thenReturn("10000");
    // Max tx = 5
    when(appCache.get(AppCache.Keys.VELOCITY_MAX_TX_2M.name())).thenReturn("5");

    // Lua returns count = 6 (exceeds limit)
    List<Object> luaResult = Arrays.<Object>asList(6L, 100L);
    when(stringRedisTemplate.execute(any(), anyList(), any(Object[].class))).thenReturn(luaResult);

    String result = velocityRiskService.evaluateTransferRisk(sampleEntry);

    assertThat(result).isNotNull();
    assertThat(result).contains("VELOCITY_LIMIT_EXCEEDED");
  }

  @Test
  void testCleanTransferReturnsNull() {
    sampleEntry.setAmount(new BigDecimal("200.00"));
    when(appCache.get(AppCache.Keys.HIGH_VALUE_HOLD_THRESHOLD.name())).thenReturn("10000");
    when(appCache.get(AppCache.Keys.VELOCITY_MAX_TX_2M.name())).thenReturn("5");

    // Lua returns count = 2 (within limit)
    List<Object> luaResult = Arrays.<Object>asList(2L, 100L);
    when(stringRedisTemplate.execute(any(), anyList(), any(Object[].class))).thenReturn(luaResult);

    String result = velocityRiskService.evaluateTransferRisk(sampleEntry);

    assertThat(result).isNull();
  }

  @Test
  void testRedisUnavailableFailsOpen() {
    sampleEntry.setAmount(new BigDecimal("200.00"));
    when(appCache.get(AppCache.Keys.HIGH_VALUE_HOLD_THRESHOLD.name())).thenReturn("10000");
    when(appCache.get(AppCache.Keys.VELOCITY_MAX_TX_2M.name())).thenReturn("5");

    // Redis is unavailable — execute throws
    when(stringRedisTemplate.execute(any(), anyList(), any(Object[].class)))
        .thenThrow(new RuntimeException("Redis connection refused"));

    // Should fail-open (return null, not throw)
    String result = velocityRiskService.evaluateTransferRisk(sampleEntry);
    assertThat(result).isNull();
  }
}
