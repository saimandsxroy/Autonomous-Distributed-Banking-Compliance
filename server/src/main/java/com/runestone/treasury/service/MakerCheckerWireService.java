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
      requiredApprovals = 2;
    }

    String key =
        (dto.getIdempotencyKey() != null && !dto.getIdempotencyKey().isBlank())
            ? dto.getIdempotencyKey()
            : "CORP-WIRE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

    MakerCheckerWire wire = new MakerCheckerWire();
    wire.setIdempotencyKey(key);
    wire.setSourceAccountId(dto.getSourceAccountId());
    wire.setDestinationAccountId(dto.getDestinationAccountId());
    wire.setAmount(amount);
    wire.setCurrency(dto.getCurrency() != null ? dto.getCurrency() : "USD");
    wire.setDescription(
        dto.getDescription() != null ? dto.getDescription() : "Corporate spend transfer");
    wire.setPolicyTier(policyTier);
    wire.setRequiredApprovals(requiredApprovals);
    wire.setCurrentApprovals(0);
    wire.setMakerUserName(operator);
    wire.setCreatedAt(LocalDateTime.now());

    if ("TIER_1_AUTO".equals(policyTier)) {
      JournalEntry je = new JournalEntry();
      je.setIdempotencyKey(key);
      je.setSourceAccountId(wire.getSourceAccountId());
      je.setDestinationAccountId(wire.getDestinationAccountId());
      je.setAmount(wire.getAmount());
      je.setCurrency(wire.getCurrency());
      je.setReferenceType("CORPORATE_WIRE");
      je.setTitle("Tier 1 Auto-Settled Corporate Spend");
      je.setContent(wire.getDescription());

      journalEntryService.saveEntry(je, operator, false, null);
      wire.setStatus("SETTLED");
      wire.setSettledJournalEntryId(je.getId());
      log.info("Tier 1 corporate wire #{} auto-settled immediately: amount={}", key, amount);
    } else {
      wire.setStatus("PENDING_APPROVAL");
      log.info(
          "Corporate wire #{} submitted under {}: requires {} approval(s)",
          key,
          policyTier,
          requiredApprovals);
    }
