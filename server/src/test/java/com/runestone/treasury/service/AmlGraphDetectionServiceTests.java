package com.runestone.treasury.service;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

import com.runestone.treasury.cache.AppCache;
import com.runestone.treasury.repository.PostingLegRepository;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AmlGraphDetectionServiceTests {

  @Mock private PostingLegRepository postingLegRepository;

  @Mock private AppCache appCache;

  @InjectMocks private AmlGraphDetectionService amlGraphDetectionService;

  @BeforeEach
  void setup() {
    when(appCache.get("AML_CIRCULAR_RING_MAX_HOPS")).thenReturn("5");
    when(appCache.get("AML_FAN_OUT_MAX_24H")).thenReturn("4");
    when(appCache.get("AML_FAN_IN_MAX_24H")).thenReturn("4");
  }

  @Test
  void testCircularRingDetected() {
    when(postingLegRepository.detectsCircularRingPreTransfer(1L, 3L, 5)).thenReturn(true);

    String result =
        amlGraphDetectionService.evaluateTransferGraphRisk(1L, 3L, BigDecimal.valueOf(90));

    assertNotNull(result);
    assertTrue(result.startsWith("CIRCULAR_RING_DETECTED"));
    assertTrue(result.contains("3->...-> 1"));
  }

  @Test
  void testFanOutStructuringDetected() {
    when(postingLegRepository.detectsCircularRingPreTransfer(anyLong(), anyLong(), anyInt()))
        .thenReturn(false);
    when(postingLegRepository.countDistinctOutboundCounterparties24h(1L)).thenReturn(5L);

    String result =
        amlGraphDetectionService.evaluateTransferGraphRisk(1L, 2L, BigDecimal.valueOf(100));

    assertNotNull(result);
    assertTrue(result.startsWith("STRUCTURING_FAN_OUT_DETECTED"));
    assertTrue(result.contains("5"));
  }

  @Test
  void testMuleFanInDetected() {
    when(postingLegRepository.detectsCircularRingPreTransfer(anyLong(), anyLong(), anyInt()))
        .thenReturn(false);
    when(postingLegRepository.countDistinctOutboundCounterparties24h(anyLong())).thenReturn(2L);
    when(postingLegRepository.countDistinctInboundCounterparties24h(2L)).thenReturn(6L);

    String result =
        amlGraphDetectionService.evaluateTransferGraphRisk(1L, 2L, BigDecimal.valueOf(100));

    assertNotNull(result);
    assertTrue(result.startsWith("MULE_FAN_IN_DETECTED"));
    assertTrue(result.contains("6"));
  }

  @Test
  void testCleanTransferReturnsNull() {
    when(postingLegRepository.detectsCircularRingPreTransfer(anyLong(), anyLong(), anyInt()))
        .thenReturn(false);
    when(postingLegRepository.countDistinctOutboundCounterparties24h(anyLong())).thenReturn(1L);
    when(postingLegRepository.countDistinctInboundCounterparties24h(anyLong())).thenReturn(1L);

    String result =
        amlGraphDetectionService.evaluateTransferGraphRisk(1L, 2L, BigDecimal.valueOf(50));

    assertNull(result);
  }

  @Test
  void testFailOpenWhenExceptionThrown() {
    when(postingLegRepository.detectsCircularRingPreTransfer(anyLong(), anyLong(), anyInt()))
        .thenThrow(new RuntimeException("DB unavailable"));

    String result =
        amlGraphDetectionService.evaluateTransferGraphRisk(1L, 2L, BigDecimal.valueOf(100));

    // Should fail open — not block the transfer
    assertNull(result);
  }

  @Test
  void testDefaultConfigWhenCacheReturnsNull() {
    when(appCache.get("AML_CIRCULAR_RING_MAX_HOPS")).thenReturn(null);
    when(appCache.get("AML_FAN_OUT_MAX_24H")).thenReturn(null);
    when(appCache.get("AML_FAN_IN_MAX_24H")).thenReturn(null);
    when(postingLegRepository.detectsCircularRingPreTransfer(anyLong(), anyLong(), anyInt()))
        .thenReturn(false);
    when(postingLegRepository.countDistinctOutboundCounterparties24h(anyLong())).thenReturn(1L);
    when(postingLegRepository.countDistinctInboundCounterparties24h(anyLong())).thenReturn(1L);

    String result =
        amlGraphDetectionService.evaluateTransferGraphRisk(1L, 2L, BigDecimal.valueOf(50));
    assertNull(result);
  }
}
