package com.runestone.treasury.service;

import com.runestone.treasury.dto.request.EodStatementLineDto;
import com.runestone.treasury.entity.JournalEntry;
import com.runestone.treasury.entity.ReconciliationDiscrepancy;
import com.runestone.treasury.entity.ReconciliationRun;
import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.repository.JournalEntryRepository;
import com.runestone.treasury.repository.ReconciliationDiscrepancyRepository;
import com.runestone.treasury.repository.ReconciliationRunRepository;
import com.runestone.treasury.repository.TreasuryAccountRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EodReconciliationService {

  private static final Logger log = LoggerFactory.getLogger(EodReconciliationService.class);

  @Autowired private ReconciliationRunRepository reconciliationRunRepository;

  @Autowired private ReconciliationDiscrepancyRepository reconciliationDiscrepancyRepository;

  @Autowired private JournalEntryRepository journalEntryRepository;

  @Autowired private JournalEntryService journalEntryService;

  @Autowired private TreasuryAccountRepository treasuryAccountRepository;

  @Autowired private ComplianceAuditLogService complianceAuditLogService;

  public List<ReconciliationRun> getRuns() {
    return reconciliationRunRepository.findAllByOrderByCreatedAtDesc();
  }

  public List<ReconciliationDiscrepancy> getDiscrepanciesForRun(Long runId) {
    return reconciliationDiscrepancyRepository.findByRunIdOrderByIdAsc(runId);
  }

  @Transactional
  public ReconciliationRun runStatement(
      List<EodStatementLineDto> externalLines, String executedBy) {
    return executeReconciliation(externalLines, null, executedBy);
  }

  @Transactional
  public ReconciliationRun simulateAnomalies(String executedBy) {
    List<JournalEntry> settled = journalEntryRepository.findByStatus("SETTLED");
    if (settled.size() < 3) {
      // Seed a couple of settled transfers if database has fewer than 3
      seedBaselineSettledEntries(executedBy);
      settled = journalEntryRepository.findByStatus("SETTLED");
    }

    // Pick up to 5 settled entries for the simulation scope
    int scopeSize = Math.min(settled.size(), 6);
    List<JournalEntry> scope =
        new ArrayList<>(settled.subList(settled.size() - scopeSize, settled.size()));

    Set<String> scopeInternalKeys = new HashSet<>();
    for (JournalEntry je : scope) {
      if (je.getIdempotencyKey() != null) {
        scopeInternalKeys.add(je.getIdempotencyKey());
      }
    }

    List<EodStatementLineDto> simulatedLines = new ArrayList<>();

    // We will inject 3 anomalies:
    // 1. MISSING_INTERNAL: Brand new external SWIFT line with no internal journal entry
    // 2. AMOUNT_MISMATCH: An internal entry where external clearing amount drifted by +$25.00
    // 3. MISSING_EXTERNAL: An internal entry that is omitted from external clearing statement

    // Element 0: AMOUNT_MISMATCH
    JournalEntry mismatchEntry = scope.get(0);
    BigDecimal driftedAmount = mismatchEntry.getAmount().add(new BigDecimal("25.0000"));
    simulatedLines.add(
        new EodStatementLineDto(
            mismatchEntry.getIdempotencyKey(),
            mismatchEntry.getSourceAccountId(),
            mismatchEntry.getDestinationAccountId(),
            driftedAmount,
            mismatchEntry.getCurrency()));

    // Element 1: MISSING_EXTERNAL (omitted from simulatedLines, remains only in scopeInternalKeys)
    // scope.get(1) is intentionally skipped in simulatedLines

    // Remaining scope elements: MATCHED (clean 1-to-1 parity)
    for (int i = 2; i < scope.size(); i++) {
      JournalEntry je = scope.get(i);
      simulatedLines.add(
          new EodStatementLineDto(
              je.getIdempotencyKey(),
              je.getSourceAccountId(),
              je.getDestinationAccountId(),
              je.getAmount(),
              je.getCurrency()));
    }

    // Element for MISSING_INTERNAL: External wire deposit with unknown idempotency key
    String externalKey =
        "SWIFT-MT940-EXT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    simulatedLines.add(
        new EodStatementLineDto(externalKey, 999L, 1L, new BigDecimal("5400.0000"), "USD"));

    return executeReconciliation(simulatedLines, scopeInternalKeys, executedBy);
  }

  private void seedBaselineSettledEntries(String executedBy) {
    try {
      for (int i = 1; i <= 3; i++) {
        JournalEntry je = new JournalEntry();
        je.setIdempotencyKey("SEED-RECON-" + UUID.randomUUID().toString().substring(0, 8));
        je.setSourceAccountId(1L);
        je.setDestinationAccountId(2L);
        je.setAmount(new BigDecimal(100 * i + ".0000"));
        je.setCurrency("USD");
        je.setReferenceType("TRANSFER");
        je.setTitle("Baseline Reconciliation Seed #" + i);
        je.setContent("Automated seed transfer for reconciliation baseline");
        journalEntryService.saveEntry(
            je, executedBy != null ? executedBy : "sarah_compliance", false, null);
      }
    } catch (Exception e) {
      log.warn("Failed seeding baseline entries for reconciliation: {}", e.getMessage());
    }
  }

  private ReconciliationRun executeReconciliation(
      List<EodStatementLineDto> externalLines, Set<String> scopedInternalKeys, String executedBy) {

    String statementRef =
        "MT940-"
            + System.currentTimeMillis()
            + "-"
            + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
    String operator =
        (executedBy != null && !executedBy.isBlank()) ? executedBy : "sarah_compliance";

    List<JournalEntry> settled = journalEntryRepository.findByStatus("SETTLED");
    Map<String, JournalEntry> internalMap = new HashMap<>();
    for (JournalEntry je : settled) {
      if (je.getIdempotencyKey() != null) {
        if (scopedInternalKeys == null || scopedInternalKeys.contains(je.getIdempotencyKey())) {
          internalMap.put(je.getIdempotencyKey(), je);
        }
      }
    }

    Set<String> matchedKeys = new HashSet<>();
    List<ReconciliationDiscrepancy> discrepancies = new ArrayList<>();

    int matchedCount = 0;
    int missingInternalCount = 0;
    int amountMismatchCount = 0;

    int totalExternal = (externalLines != null) ? externalLines.size() : 0;

    if (externalLines != null) {
      for (EodStatementLineDto line : externalLines) {
        String key = line.getIdempotencyKey();
        if (key == null) continue;

        JournalEntry internal = internalMap.get(key);
        if (internal == null) {
          // Missing in internal ledger
          missingInternalCount++;
          ReconciliationDiscrepancy disc = new ReconciliationDiscrepancy();
          disc.setIdempotencyKey(key);
          disc.setSourceAccountId(line.getSourceAccountId());
          disc.setDestinationAccountId(line.getDestinationAccountId());
          disc.setDiscrepancyType("MISSING_INTERNAL");
          disc.setExternalAmount(line.getAmount());
          disc.setInternalAmount(null);
          disc.setCurrency(line.getCurrency() != null ? line.getCurrency() : "USD");
          disc.setResolutionStatus("OPEN");
          discrepancies.add(disc);
        } else {
          matchedKeys.add(key);
          BigDecimal extAmt = line.getAmount() != null ? line.getAmount() : BigDecimal.ZERO;
          BigDecimal intAmt = internal.getAmount() != null ? internal.getAmount() : BigDecimal.ZERO;

          if (extAmt.compareTo(intAmt) == 0) {
            matchedCount++;
          } else {
            amountMismatchCount++;
            ReconciliationDiscrepancy disc = new ReconciliationDiscrepancy();
            disc.setIdempotencyKey(key);
            disc.setSourceAccountId(internal.getSourceAccountId());
            disc.setDestinationAccountId(internal.getDestinationAccountId());
            disc.setDiscrepancyType("AMOUNT_MISMATCH");
            disc.setExternalAmount(line.getAmount());
            disc.setInternalAmount(internal.getAmount());
            disc.setCurrency(
                line.getCurrency() != null ? line.getCurrency() : internal.getCurrency());
            disc.setResolutionStatus("OPEN");
            discrepancies.add(disc);
          }
        }
      }
    }

    // Check for internal entries missing from external statement
    int missingExternalCount = 0;
    for (Map.Entry<String, JournalEntry> entry : internalMap.entrySet()) {
      if (!matchedKeys.contains(entry.getKey())) {
        missingExternalCount++;
        JournalEntry internal = entry.getValue();
        ReconciliationDiscrepancy disc = new ReconciliationDiscrepancy();
        disc.setIdempotencyKey(internal.getIdempotencyKey());
        disc.setSourceAccountId(internal.getSourceAccountId());
        disc.setDestinationAccountId(internal.getDestinationAccountId());
        disc.setDiscrepancyType("MISSING_EXTERNAL");
        disc.setExternalAmount(null);
        disc.setInternalAmount(internal.getAmount());
        disc.setCurrency(internal.getCurrency());
        disc.setResolutionStatus("OPEN");
        discrepancies.add(disc);
      }
    }

    String status =
        (missingInternalCount == 0 && amountMismatchCount == 0 && missingExternalCount == 0)
            ? "RECONCILED_CLEAN"
            : "DISCREPANCIES_FOUND";

    ReconciliationRun run = new ReconciliationRun();
    run.setStatementReference(statementRef);
    run.setTotalExternalRecords(totalExternal);
    run.setMatchedCount(matchedCount);
    run.setMissingInternalCount(missingInternalCount);
    run.setMissingExternalCount(missingExternalCount);
    run.setAmountMismatchCount(amountMismatchCount);
    run.setStatus(status);
    run.setExecutedBy(operator);
    run.setCreatedAt(LocalDateTime.now());

    ReconciliationRun savedRun = reconciliationRunRepository.save(run);

    for (ReconciliationDiscrepancy disc : discrepancies) {
      disc.setRunId(savedRun.getId());
      reconciliationDiscrepancyRepository.save(disc);
    }

    complianceAuditLogService.recordAuditEvent(
        operator, "RECONCILIATION_RUN_COMPLETED", savedRun.getId(), savedRun);

    log.info(
        "Reconciliation run #{} ({}) completed by {}: matched={}, missingInt={}, missingExt={}, mismatch={}",
        savedRun.getId(),
        savedRun.getStatementReference(),
        operator,
        matchedCount,
        missingInternalCount,
        missingExternalCount,
        amountMismatchCount);

    return savedRun;
  }

  @Transactional
  public ReconciliationDiscrepancy resolveDiscrepancy(
      Long discrepancyId, String resolvedBy, String notes) {
    ReconciliationDiscrepancy discrepancy =
        reconciliationDiscrepancyRepository
            .findById(discrepancyId)
            .orElseThrow(
                () -> new IllegalArgumentException("Discrepancy not found: " + discrepancyId));

    if (!"OPEN".equalsIgnoreCase(discrepancy.getResolutionStatus())) {
      throw new IllegalStateException(
          "Discrepancy is already resolved: " + discrepancy.getResolutionStatus());
    }

    String operator =
        (resolvedBy != null && !resolvedBy.isBlank()) ? resolvedBy : "sarah_compliance";

    // Institutional Nostro Suspense Account
    TreasuryAccount nostro =
        treasuryAccountRepository
            .findByAccountNumber("AC-SYS-NOSTRO-USD")
            .orElseGet(
                () -> {
                  TreasuryAccount newNostro = new TreasuryAccount();
                  newNostro.setAccountNumber("AC-SYS-NOSTRO-USD");
                  newNostro.setCurrency("USD");
                  newNostro.setStatus("ACTIVE");
                  newNostro.setPostedBalance(new BigDecimal("10000000.0000"));
                  newNostro.setAvailableBalance(new BigDecimal("10000000.0000"));
                  newNostro.setHeldBalance(BigDecimal.ZERO);
                  newNostro.setVersion(0L);
                  return treasuryAccountRepository.save(newNostro);
                });

    JournalEntry compensatingEntry = new JournalEntry();
    compensatingEntry.setIdempotencyKey(
        "COMP-ADJ-" + discrepancy.getId() + "-" + UUID.randomUUID().toString().substring(0, 8));
    compensatingEntry.setCurrency(
        discrepancy.getCurrency() != null ? discrepancy.getCurrency() : "USD");
    compensatingEntry.setReferenceType("COMPENSATING_ADJUSTMENT");

    if ("MISSING_INTERNAL".equalsIgnoreCase(discrepancy.getDiscrepancyType())) {
      // External statement has credit that was not posted internally.
      // Settle from Nostro suspense into target user account (defaulting to account 1 if null)
      Long destId =
          discrepancy.getDestinationAccountId() != null
              ? discrepancy.getDestinationAccountId()
              : 1L;
      compensatingEntry.setSourceAccountId(nostro.getId());
      compensatingEntry.setDestinationAccountId(destId);
      compensatingEntry.setAmount(discrepancy.getExternalAmount());
      compensatingEntry.setTitle(
          "Compensating Adjustment: Inbound SWIFT Deposit #" + discrepancy.getId());
      compensatingEntry.setContent(
          notes != null
              ? notes
              : "Healed MISSING_INTERNAL ledger drift via Nostro suspense credit");
    } else if ("AMOUNT_MISMATCH".equalsIgnoreCase(discrepancy.getDiscrepancyType())) {
      // Calculate difference between external and internal amount
      BigDecimal ext =
          discrepancy.getExternalAmount() != null
              ? discrepancy.getExternalAmount()
              : BigDecimal.ZERO;
      BigDecimal internal =
          discrepancy.getInternalAmount() != null
              ? discrepancy.getInternalAmount()
              : BigDecimal.ZERO;
      BigDecimal diff = ext.subtract(internal);

      Long customerAccountId =
          discrepancy.getDestinationAccountId() != null
              ? discrepancy.getDestinationAccountId()
              : 1L;
      if (diff.compareTo(BigDecimal.ZERO) > 0) {
        // External credited more than internal ledger: compensate customer from Nostro
        compensatingEntry.setSourceAccountId(nostro.getId());
        compensatingEntry.setDestinationAccountId(customerAccountId);
        compensatingEntry.setAmount(diff);
      } else {
        // External credited less: customer was over-credited internally, adjust back to Nostro
        compensatingEntry.setSourceAccountId(customerAccountId);
        compensatingEntry.setDestinationAccountId(nostro.getId());
        compensatingEntry.setAmount(diff.abs());
      }
      compensatingEntry.setTitle(
          "Compensating Adjustment: Fee/Amount Drift #" + discrepancy.getId());
      compensatingEntry.setContent(
          notes != null ? notes : "Healed AMOUNT_MISMATCH fee drift via Nostro suspense");
    } else { // MISSING_EXTERNAL
      // Internal transfer posted, but external SWIFT clearance never occurred
      // Compensate from destination back to source or through Nostro
      Long src = discrepancy.getSourceAccountId() != null ? discrepancy.getSourceAccountId() : 1L;
      compensatingEntry.setSourceAccountId(nostro.getId());
      compensatingEntry.setDestinationAccountId(src);
      compensatingEntry.setAmount(
          discrepancy.getInternalAmount() != null
              ? discrepancy.getInternalAmount()
              : new BigDecimal("100.0000"));
      compensatingEntry.setTitle(
          "Compensating Adjustment: Unconfirmed Wire Void #" + discrepancy.getId());
      compensatingEntry.setContent(
          notes != null ? notes : "Healed MISSING_EXTERNAL unconfirmed wire via Nostro reversal");
    }

    journalEntryService.saveEntry(compensatingEntry, operator, false, null);

    discrepancy.setResolutionStatus("COMPENSATING_JOURNAL_POSTED");
    discrepancy.setCompensatingJournalId(compensatingEntry.getId());
    discrepancy.setResolvedBy(operator);
    discrepancy.setResolutionNotes(
        notes != null
            ? notes
            : "Compensating journal #" + compensatingEntry.getId() + " posted successfully.");
    ReconciliationDiscrepancy updated = reconciliationDiscrepancyRepository.save(discrepancy);

    // If all discrepancies in this run are resolved, mark run as RESOLVED
    List<ReconciliationDiscrepancy> runDiscrepancies =
        reconciliationDiscrepancyRepository.findByRunId(discrepancy.getRunId());
    boolean allResolved =
        runDiscrepancies.stream().allMatch(d -> !"OPEN".equalsIgnoreCase(d.getResolutionStatus()));
    if (allResolved) {
      reconciliationRunRepository
          .findById(discrepancy.getRunId())
          .ifPresent(
              run -> {
                run.setStatus("RESOLVED");
                reconciliationRunRepository.save(run);
              });
    }

    complianceAuditLogService.recordAuditEvent(
        operator, "RECONCILIATION_DISCREPANCY_RESOLVED", updated.getId(), updated);

    log.info(
        "Discrepancy #{} resolved by {} with compensating journal #{}",
        updated.getId(),
        operator,
        compensatingEntry.getId());

    return updated;
  }
}
