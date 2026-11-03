package com.runestone.treasury.service;

import com.runestone.treasury.dto.request.MakerCheckerWireRequestDto;
import com.runestone.treasury.entity.JournalEntry;
import com.runestone.treasury.entity.MakerCheckerWire;
import com.runestone.treasury.exception.SeparationOfDutiesViolationException;
import com.runestone.treasury.repository.MakerCheckerWireRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MakerCheckerWireService {

  private static final Logger log = LoggerFactory.getLogger(MakerCheckerWireService.class);

  @Autowired private MakerCheckerWireRepository makerCheckerWireRepository;

  @Autowired private JournalEntryService journalEntryService;

  @Autowired private ComplianceAuditLogService complianceAuditLogService;

  public List<MakerCheckerWire> getWires() {
    return makerCheckerWireRepository.findAllByOrderByCreatedAtDesc();
  }

  @Transactional
  public MakerCheckerWire submitWire(MakerCheckerWireRequestDto dto, String makerUserName) {
    String operator = (makerUserName != null && !makerUserName.isBlank()) ? makerUserName : "alice";
    BigDecimal amount = dto.getAmount();
    if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
      throw new IllegalArgumentException("Wire amount must be greater than zero");
    }

    String policyTier;
    int requiredApprovals;
    if (amount.compareTo(new BigDecimal("1000.00")) < 0) {
      policyTier = "TIER_1_AUTO";
      requiredApprovals = 0;
    } else if (amount.compareTo(new BigDecimal("10000.00")) < 0) {
      policyTier = "TIER_2_SINGLE_CHECKER";
      requiredApprovals = 1;
    } else {
      policyTier = "TIER_3_DUAL_CHECKER";
