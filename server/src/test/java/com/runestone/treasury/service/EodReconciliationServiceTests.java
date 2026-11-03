package com.runestone.treasury.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
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
class EodReconciliationServiceTests {

  @Mock private ReconciliationRunRepository reconciliationRunRepository;

  @Mock private ReconciliationDiscrepancyRepository reconciliationDiscrepancyRepository;

  @Mock private JournalEntryRepository journalEntryRepository;

  @Mock private JournalEntryService journalEntryService;

  @Mock private TreasuryAccountRepository treasuryAccountRepository;

  @Mock private ComplianceAuditLogService complianceAuditLogService;

  @InjectMocks private EodReconciliationService eodReconciliationService;

  private TreasuryAccount nostroAccount;

  @BeforeEach
  void setUp() {
    nostroAccount = new TreasuryAccount();
    nostroAccount.setId(18L);
    nostroAccount.setAccountNumber("AC-SYS-NOSTRO-USD");
    nostroAccount.setCurrency("USD");
    nostroAccount.setPostedBalance(new BigDecimal("10000000.0000"));
    nostroAccount.setAvailableBalance(new BigDecimal("10000000.0000"));

    when(treasuryAccountRepository.findByAccountNumber("AC-SYS-NOSTRO-USD"))
        .thenReturn(Optional.of(nostroAccount));

    when(reconciliationRunRepository.save(any(ReconciliationRun.class)))
        .thenAnswer(
            inv -> {
              ReconciliationRun r = inv.getArgument(0);
              r.setId(101L);
              return r;
