package com.runestone.treasury.service;

import com.runestone.treasury.cache.AppCache;
import com.runestone.treasury.entity.BalanceHold;
import com.runestone.treasury.repository.BalanceHoldRepository;
import com.runestone.treasury.repository.PostingLegRepository;
import com.runestone.treasury.repository.TreasuryAccountRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
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

  @Autowired(required = false)
  private TreasuryAccountRepository treasuryAccountRepository;

  @Autowired(required = false)
  private BalanceHoldRepository balanceHoldRepository;

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
   * Returns the 5-hop subgraph analysis for an account including nodes, edges, cycle detection, and
   * fan-out/fan-in metrics. Used by the compliance dashboard.
   */
  public Map<String, Object> getAccountSubgraph(Long accountId) {
    Map<String, Object> result = new HashMap<>();
    try {
      List<Object[]> edgeRows = postingLegRepository.getThreeHopSubgraph(accountId);
      Map<String, Map<String, Object>> edgeMap = new LinkedHashMap<>();
      Set<Long> nodeSet = new HashSet<>();
      if (accountId != null) {
        nodeSet.add(accountId);
      }

      for (Object[] row : edgeRows) {
        Long fromAccount = toLong(row[0]);
        Long toAccount = toLong(row[1]);
        if (fromAccount == null || toAccount == null) continue;

        String key = fromAccount + "->" + toAccount;
        Map<String, Object> edge = new HashMap<>();
        edge.put("from", fromAccount);
        edge.put("to", toAccount);
        edge.put("source", fromAccount);
        edge.put("target", toAccount);
        edge.put("amount", row[2]);
        edge.put("timestamp", row[3] != null ? row[3].toString() : null);
        edge.put("hopDepth", row[4]);

        edgeMap.put(key, edge);
        nodeSet.add(fromAccount);
        nodeSet.add(toAccount);
      }

      // Check balance_holds for circular holds or pending holds
      if (balanceHoldRepository != null) {
        List<BalanceHold> holds = balanceHoldRepository.findAll();
        for (BalanceHold bh : holds) {
          if (bh.getSourceAccountId() != null && bh.getDestinationAccountId() != null) {
            Long src = bh.getSourceAccountId();
            Long dst = bh.getDestinationAccountId();
            boolean isCirc = bh.getRiskReason() != null && bh.getRiskReason().contains("CIRCULAR");
            boolean relevant =
                src.equals(accountId)
                    || dst.equals(accountId)
                    || (nodeSet.contains(src) && nodeSet.contains(dst));
            if (relevant && isCirc) {
              String key = src + "->" + dst;
              Map<String, Object> holdEdge = new HashMap<>();
              holdEdge.put("from", src);
              holdEdge.put("to", dst);
              holdEdge.put("source", src);
              holdEdge.put("target", dst);
              holdEdge.put("amount", bh.getAmount());
              holdEdge.put(
                  "timestamp", bh.getCreatedAt() != null ? bh.getCreatedAt().toString() : null);
              holdEdge.put("hopDepth", 3);
              holdEdge.put("isHold", true);
              holdEdge.put("isCycle", true);
              edgeMap.put(key, holdEdge);
              nodeSet.add(src);
              nodeSet.add(dst);
            }
          }
        }
      }

      List<Map<String, Object>> edges = new ArrayList<>(edgeMap.values());

      // Dynamic Cycle Detection across all edges using DFS
      List<String> cyclePaths = detectCycles(edges);
      boolean cycleDetected = !cyclePaths.isEmpty();

      for (Map<String, Object> edge : edges) {
        Long fromAccount = (Long) edge.get("from");
        Long toAccount = (Long) edge.get("to");
        String edgeSub = fromAccount + "->" + toAccount;
        boolean inCycle = false;
        for (String cp : cyclePaths) {
          if (cp.contains(edgeSub)) {
            inCycle = true;
            break;
          }
        }
        if (inCycle) {
          edge.put("isCycle", true);
