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
