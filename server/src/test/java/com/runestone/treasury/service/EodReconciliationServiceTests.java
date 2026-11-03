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
            });

    when(reconciliationDiscrepancyRepository.save(any(ReconciliationDiscrepancy.class)))
        .thenAnswer(
            inv -> {
              ReconciliationDiscrepancy d = inv.getArgument(0);
              if (d.getId() == null) d.setId(501L);
              return d;
            });
  }

  @Test
  void testRunStatement_MatchedClean() {
    JournalEntry entry1 = new JournalEntry();
    entry1.setId(1L);
    entry1.setIdempotencyKey("KEY-1");
    entry1.setSourceAccountId(1L);
    entry1.setDestinationAccountId(2L);
    entry1.setAmount(new BigDecimal("100.0000"));
    entry1.setCurrency("USD");
    entry1.setStatus("SETTLED");

    when(journalEntryRepository.findByStatus("SETTLED")).thenReturn(List.of(entry1));

    List<EodStatementLineDto> lines =
        List.of(new EodStatementLineDto("KEY-1", 1L, 2L, new BigDecimal("100.0000"), "USD"));

    ReconciliationRun run = eodReconciliationService.runStatement(lines, "sarah_compliance");

    assertNotNull(run);
    assertEquals("RECONCILED_CLEAN", run.getStatus());
    assertEquals(1, run.getMatchedCount());
    assertEquals(0, run.getMissingInternalCount());
    assertEquals(0, run.getMissingExternalCount());
    assertEquals(0, run.getAmountMismatchCount());
  }

  @Test
  void testRunStatement_DiscrepanciesDetected() {
    JournalEntry internal1 = new JournalEntry();
    internal1.setId(1L);
    internal1.setIdempotencyKey("KEY-INTERNAL-ONLY");
    internal1.setAmount(new BigDecimal("200.0000"));
    internal1.setCurrency("USD");
    internal1.setStatus("SETTLED");

    JournalEntry internal2 = new JournalEntry();
    internal2.setId(2L);
    internal2.setIdempotencyKey("KEY-MISMATCH");
    internal2.setAmount(new BigDecimal("300.0000"));
    internal2.setCurrency("USD");
    internal2.setStatus("SETTLED");

    when(journalEntryRepository.findByStatus("SETTLED")).thenReturn(List.of(internal1, internal2));

    List<EodStatementLineDto> lines =
        List.of(
            // Line 1: AMOUNT_MISMATCH
            new EodStatementLineDto("KEY-MISMATCH", 1L, 2L, new BigDecimal("325.0000"), "USD"),
            // Line 2: MISSING_INTERNAL
            new EodStatementLineDto(
                "KEY-EXTERNAL-ONLY", 1L, 2L, new BigDecimal("500.0000"), "USD"));

    ReconciliationRun run = eodReconciliationService.runStatement(lines, "sarah_compliance");

    assertNotNull(run);
    assertEquals("DISCREPANCIES_FOUND", run.getStatus());
    assertEquals(0, run.getMatchedCount());
    assertEquals(1, run.getMissingInternalCount());
    assertEquals(1, run.getMissingExternalCount()); // KEY-INTERNAL-ONLY was not in external lines
    assertEquals(1, run.getAmountMismatchCount());
  }

  @Test
  void testSimulateAnomalies() {
    List<JournalEntry> baseline = new ArrayList<>();
    for (int i = 1; i <= 4; i++) {
      JournalEntry je = new JournalEntry();
      je.setId((long) i);
      je.setIdempotencyKey("SIM-KEY-" + i);
      je.setSourceAccountId(1L);
      je.setDestinationAccountId(2L);
      je.setAmount(new BigDecimal(100 * i + ".0000"));
      je.setCurrency("USD");
      je.setStatus("SETTLED");
      baseline.add(je);
    }
    when(journalEntryRepository.findByStatus("SETTLED")).thenReturn(baseline);

    ReconciliationRun run = eodReconciliationService.simulateAnomalies("sarah_compliance");

    assertNotNull(run);
    assertEquals("DISCREPANCIES_FOUND", run.getStatus());
    assertEquals(1, run.getMissingInternalCount());
    assertEquals(1, run.getAmountMismatchCount());
    assertEquals(1, run.getMissingExternalCount());
  }

  @Test
  void testResolveDiscrepancy_MissingInternal() {
    ReconciliationDiscrepancy disc = new ReconciliationDiscrepancy();
    disc.setId(501L);
    disc.setRunId(101L);
    disc.setDiscrepancyType("MISSING_INTERNAL");
    disc.setExternalAmount(new BigDecimal("5400.0000"));
    disc.setDestinationAccountId(1L);
    disc.setCurrency("USD");
    disc.setResolutionStatus("OPEN");

    when(reconciliationDiscrepancyRepository.findById(501L)).thenReturn(Optional.of(disc));
    when(reconciliationDiscrepancyRepository.findByRunId(101L)).thenReturn(List.of(disc));

    ReconciliationRun run = new ReconciliationRun();
    run.setId(101L);
    run.setStatus("DISCREPANCIES_FOUND");
    when(reconciliationRunRepository.findById(101L)).thenReturn(Optional.of(run));

    ReconciliationDiscrepancy resolved =
        eodReconciliationService.resolveDiscrepancy(
            501L, "sarah_compliance", "Resolved missing wire");

    assertNotNull(resolved);
    assertEquals("COMPENSATING_JOURNAL_POSTED", resolved.getResolutionStatus());
    assertEquals("sarah_compliance", resolved.getResolvedBy());
    verify(journalEntryService)
        .saveEntry(any(JournalEntry.class), eq("sarah_compliance"), eq(false), any());
  }

  @Test
  void testResolveDiscrepancy_AlreadyResolvedThrows() {
    ReconciliationDiscrepancy disc = new ReconciliationDiscrepancy();
    disc.setId(502L);
    disc.setResolutionStatus("COMPENSATING_JOURNAL_POSTED");

    when(reconciliationDiscrepancyRepository.findById(502L)).thenReturn(Optional.of(disc));

    assertThrows(
        IllegalStateException.class,
        () -> eodReconciliationService.resolveDiscrepancy(502L, "sarah_compliance", "notes"));
  }
}
