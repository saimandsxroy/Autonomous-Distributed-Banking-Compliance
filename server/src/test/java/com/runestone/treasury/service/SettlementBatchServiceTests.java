package com.runestone.treasury.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.runestone.treasury.entity.SettlementBatch;
import com.runestone.treasury.entity.SettlementBatchItem;
import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.repository.SettlementBatchItemRepository;
import com.runestone.treasury.repository.SettlementBatchRepository;
import com.runestone.treasury.repository.TreasuryAccountRepository;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SettlementBatchServiceTests {

  @Mock private SettlementBatchRepository settlementBatchRepository;

  @Mock private SettlementBatchItemRepository settlementBatchItemRepository;

  @Mock private TreasuryAccountRepository treasuryAccountRepository;

  @Mock private JournalEntryService journalEntryService;

  @Mock private UserService userService;

  @Mock private VelocityRiskService velocityRiskService;

  @Mock private AmlGraphDetectionService amlGraphDetectionService;

  @Mock private ComplianceAuditLogService complianceAuditLogService;

  @InjectMocks private SettlementBatchService settlementBatchService;

  @Test
  void testComputeSha256Checksum() {
    byte[] testBytes =
        "destination_account_id,amount,currency\n1,100.00,USD".getBytes(StandardCharsets.UTF_8);
    String hash1 = settlementBatchService.computeSha256(testBytes);
    String hash2 = settlementBatchService.computeSha256(testBytes);

    assertNotNull(hash1);
    assertEquals(64, hash1.length());
    assertEquals(hash1, hash2);
  }

  @Test
  void testDuplicateBatchUploadThrowsConflict() {
    byte[] fileBytes = "test-csv-bytes".getBytes(StandardCharsets.UTF_8);
    String hash = settlementBatchService.computeSha256(fileBytes);

    SettlementBatch existing = new SettlementBatch();
    existing.setBatchReference("BATCH-EXISTING-123");
    existing.setFileSha256Hash(hash);

    when(settlementBatchRepository.findByFileSha256Hash(hash)).thenReturn(Optional.of(existing));

    IllegalStateException ex =
        assertThrows(
            IllegalStateException.class,
            () ->
                settlementBatchService.processBatchUpload(
                    "payroll.csv",
                    1L,
                    fileBytes,
                    List.of(Map.of("destinationAccountId", 2L, "amount", 100)),
                    "alice"));

    assertTrue(ex.getMessage().contains("DUPLICATE_BATCH_DETECTED"));
  }

  @Test
  void testParseCsvMultiColumn() {
    String csv =
        "row_number,destination_account_id,amount,currency,description\n"
            + "1,2,500.00,USD,Engineering salary\n"
            + "2,3,750.50,EUR,Design retainer\n";

    List<Map<String, Object>> rows = settlementBatchService.parseCsv(csv);
    assertEquals(2, rows.size());

    assertEquals(1, rows.get(0).get("rowNumber"));
    assertEquals("2", rows.get(0).get("destinationAccountId"));
    assertEquals(new BigDecimal("500.00"), rows.get(0).get("amount"));
    assertEquals("USD", rows.get(0).get("currency"));

    assertEquals(2, rows.get(1).get("rowNumber"));
    assertEquals("3", rows.get(1).get("destinationAccountId"));
    assertEquals(new BigDecimal("750.50"), rows.get(1).get("amount"));
    assertEquals("EUR", rows.get(1).get("currency"));
  }

  @Test
  void testPartialFailureIsolationInBatch() {
    TreasuryAccount source = new TreasuryAccount();
    source.setId(1L);
    source.setAvailableBalance(new BigDecimal("1000.0000"));

    TreasuryAccount dest2 = new TreasuryAccount();
    dest2.setId(2L);
    TreasuryAccount dest3 = new TreasuryAccount();
    dest3.setId(3L);

    when(settlementBatchRepository.findByFileSha256Hash(anyString())).thenReturn(Optional.empty());
    when(treasuryAccountRepository.findById(1L)).thenReturn(Optional.of(source));
    when(treasuryAccountRepository.findById(2L)).thenReturn(Optional.of(dest2));
    when(treasuryAccountRepository.findById(3L)).thenReturn(Optional.of(dest3));

    when(settlementBatchRepository.save(any(SettlementBatch.class)))
        .thenAnswer(
            inv -> {
              SettlementBatch b = inv.getArgument(0);
              if (b.getId() == null) b.setId(100L);
              return b;
            });

    when(settlementBatchItemRepository.save(any(SettlementBatchItem.class)))
        .thenAnswer(
            inv -> {
              SettlementBatchItem item = inv.getArgument(0);
              if (item.getId() == null) item.setId(200L + item.getRowNumber());
              return item;
            });

    // Row 1: succeeds
    doNothing()
        .when(journalEntryService)
        .saveEntry(
            argThat(je -> je != null && je.getDestinationAccountId().equals(2L)),
            anyString(),
            anyBoolean(),
            any());

    // Row 2: throws insufficient funds error
    doThrow(new IllegalStateException("Insufficient available balance"))
        .when(journalEntryService)
        .saveEntry(
            argThat(je -> je != null && je.getDestinationAccountId().equals(3L)),
            anyString(),
            anyBoolean(),
            any());

    List<Map<String, Object>> rows = new ArrayList<>();
    Map<String, Object> row1 = new HashMap<>();
    row1.put("rowNumber", 1);
    row1.put("destinationAccountId", 2L);
    row1.put("amount", new BigDecimal("100.00"));
    row1.put("currency", "USD");
    row1.put("description", "Row 1 Good");
    rows.add(row1);

    Map<String, Object> row2 = new HashMap<>();
    row2.put("rowNumber", 2);
    row2.put("destinationAccountId", 3L);
    row2.put("amount", new BigDecimal("5000.00"));
    row2.put("currency", "USD");
    row2.put("description", "Row 2 Overdrawn");
    rows.add(row2);

    byte[] bytes = "mock-csv".getBytes(StandardCharsets.UTF_8);

    Map<String, Object> result =
        settlementBatchService.processBatchUpload("test.csv", 1L, bytes, rows, "alice");

    assertNotNull(result);
    SettlementBatch batch = (SettlementBatch) result.get("batch");
    assertEquals(2, batch.getTotalRows());
    assertEquals(1, batch.getSettledCount());
    assertEquals(1, batch.getFailedCount());
    assertEquals(0, batch.getHeldAmlCount());
    assertEquals(new BigDecimal("100.0000"), batch.getTotalSettledAmount());
    assertEquals("COMPLETED_WITH_FAILURES", batch.getStatus());
  }
}
