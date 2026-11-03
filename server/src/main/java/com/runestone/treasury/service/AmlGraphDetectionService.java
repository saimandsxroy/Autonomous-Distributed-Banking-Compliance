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
