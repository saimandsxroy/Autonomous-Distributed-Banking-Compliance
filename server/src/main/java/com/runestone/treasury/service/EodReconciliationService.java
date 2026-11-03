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
