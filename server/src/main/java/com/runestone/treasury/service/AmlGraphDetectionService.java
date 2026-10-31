package com.runestone.treasury.service;

import com.runestone.treasury.cache.AppCache;
import com.runestone.treasury.repository.PostingLegRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class AmlGraphDetectionService {

  private static final Logger log = LoggerFactory.getLogger(AmlGraphDetectionService.class);

  @Autowired private PostingLegRepository postingLegRepository;

  @Autowired private AppCache appCache;

  /**
   * Evaluates whether the proposed transfer from sourceAccountId to destinationAccountId triggers
   * AML graph risk rules. Returns a non-null risk reason string if flagged, null if clean.
   */
  public String evaluateTransferGraphRisk(
      Long sourceAccountId, Long destinationAccountId, BigDecimal amount) {
    try {
      int maxHops = resolveIntConfig("AML_CIRCULAR_RING_MAX_HOPS", 5);

      // 1. Circular ring pre-transfer check
      boolean isCircular =
          postingLegRepository.detectsCircularRingPreTransfer(
              sourceAccountId, destinationAccountId, maxHops);
      if (isCircular) {
        String reason =
            "CIRCULAR_RING_DETECTED: path=" + destinationAccountId + "->...-> " + sourceAccountId;
        log.warn(
            "AML circular ring detected: source={}, destination={}",
            sourceAccountId,
            destinationAccountId);
        return reason;
      }

      // 2. Fan-out structuring check on source account
      int maxFanOut = resolveIntConfig("AML_FAN_OUT_MAX_24H", 4);
      long fanOut = postingLegRepository.countDistinctOutboundCounterparties24h(sourceAccountId);
      if (fanOut >= maxFanOut) {
        String reason = "STRUCTURING_FAN_OUT_DETECTED: distinctCounterparties=" + fanOut;
        log.warn(
            "AML fan-out structuring detected: sourceAccount={}, fanOut={}",
            sourceAccountId,
            fanOut);
        return reason;
      }

      // 3. Fan-in mule aggregation check on destination account
      int maxFanIn = resolveIntConfig("AML_FAN_IN_MAX_24H", 4);
      long fanIn = postingLegRepository.countDistinctInboundCounterparties24h(destinationAccountId);
      if (fanIn >= maxFanIn) {
        String reason = "MULE_FAN_IN_DETECTED: distinctInboundCounterparties=" + fanIn;
        log.warn(
            "AML mule fan-in detected: destinationAccount={}, fanIn={}",
            destinationAccountId,
            fanIn);
        return reason;
      }

      return null; // clean transfer
    } catch (Exception e) {
      log.error(
          "AML graph detection failed for transfer {}->{}. Failing open: {}",
          sourceAccountId,
          destinationAccountId,
          e.getMessage());
      return null; // fail-open: don't block transfers on detection error
    }
  }

  /**
   * Returns the 3-hop subgraph analysis for an account including nodes, edges, cycle detection, and
   * fan-out/fan-in metrics. Used by the compliance dashboard.
   */
  public Map<String, Object> getAccountSubgraph(Long accountId) {
    Map<String, Object> result = new HashMap<>();
    try {
      List<Object[]> edgeRows = postingLegRepository.getThreeHopSubgraph(accountId);
      List<Map<String, Object>> edges = new ArrayList<>();
      Set<Long> nodeSet = new HashSet<>();

      for (Object[] row : edgeRows) {
        Map<String, Object> edge = new HashMap<>();
        Long fromAccount = toLong(row[0]);
        Long toAccount = toLong(row[1]);
        edge.put("from", fromAccount);
        edge.put("to", toAccount);
        edge.put("amount", row[2]);
        edge.put("timestamp", row[3] != null ? row[3].toString() : null);
        edge.put("hopDepth", row[4]);
        edges.add(edge);
        nodeSet.add(fromAccount);
        nodeSet.add(toAccount);
      }

      List<Map<String, Object>> nodes = new ArrayList<>();
      for (Long nodeId : nodeSet) {
        Map<String, Object> node = new HashMap<>();
        node.put("accountId", nodeId);
        node.put("isOrigin", nodeId.equals(accountId));
        nodes.add(node);
      }

      // Circular ring detection for this account
      int maxHops = resolveIntConfig("AML_CIRCULAR_RING_MAX_HOPS", 5);
      List<Object[]> ringRows =
          postingLegRepository.findCircularTransferRingsMySql(accountId, maxHops);
      List<String> cyclePaths = new ArrayList<>();
      for (Object[] row : ringRows) {
        int isCycle = row[5] instanceof Number ? ((Number) row[5]).intValue() : 0;
        if (isCycle == 1) {
          cyclePaths.add(row[4] != null ? row[4].toString() : "");
        }
      }

      long fanOut = postingLegRepository.countDistinctOutboundCounterparties24h(accountId);
      long fanIn = postingLegRepository.countDistinctInboundCounterparties24h(accountId);

      result.put("accountId", accountId);
      result.put("nodes", nodes);
      result.put("edges", edges);
      result.put("cyclePaths", cyclePaths);
      result.put("cycleDetected", !cyclePaths.isEmpty());
      result.put("fanOutCount24h", fanOut);
      result.put("fanInCount24h", fanIn);
      result.put("riskLevel", computeRiskLevel(cyclePaths, fanOut, fanIn));
    } catch (Exception e) {
      log.error("Failed to build subgraph for account {}: {}", accountId, e.getMessage());
      result.put("error", e.getMessage());
    }
    return result;
  }

  private String computeRiskLevel(List<String> cyclePaths, long fanOut, long fanIn) {
    if (!cyclePaths.isEmpty()) return "CRITICAL";
    int maxFanOut = resolveIntConfig("AML_FAN_OUT_MAX_24H", 4);
    int maxFanIn = resolveIntConfig("AML_FAN_IN_MAX_24H", 4);
    if (fanOut >= maxFanOut || fanIn >= maxFanIn) return "HIGH";
    if (fanOut >= maxFanOut / 2 || fanIn >= maxFanIn / 2) return "MEDIUM";
    return "LOW";
  }

  private int resolveIntConfig(String key, int defaultValue) {
    try {
      String val = appCache.get(key);
      if (val != null && !val.isBlank()) {
        return Integer.parseInt(val.trim());
      }
    } catch (NumberFormatException ignored) {
    }
    return defaultValue;
  }

  private Long toLong(Object obj) {
    if (obj instanceof Long) return (Long) obj;
    if (obj instanceof Number) return ((Number) obj).longValue();
    return 0L;
  }
}
