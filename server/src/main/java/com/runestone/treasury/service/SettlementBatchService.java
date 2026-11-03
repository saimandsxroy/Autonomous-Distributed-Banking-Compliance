package com.runestone.treasury.service;

import com.runestone.treasury.entity.JournalEntry;
import com.runestone.treasury.entity.SettlementBatch;
import com.runestone.treasury.entity.SettlementBatchItem;
import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.entity.User;
import com.runestone.treasury.repository.SettlementBatchItemRepository;
import com.runestone.treasury.repository.SettlementBatchRepository;
import com.runestone.treasury.repository.TreasuryAccountRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class SettlementBatchService {

  private static final Logger log = LoggerFactory.getLogger(SettlementBatchService.class);

  @Autowired private SettlementBatchRepository settlementBatchRepository;

  @Autowired private SettlementBatchItemRepository settlementBatchItemRepository;

  @Autowired private TreasuryAccountRepository treasuryAccountRepository;

  @Autowired private JournalEntryService journalEntryService;

  @Autowired private UserService userService;

  @Autowired private VelocityRiskService velocityRiskService;

  @Autowired private AmlGraphDetectionService amlGraphDetectionService;

  @Autowired private ComplianceAuditLogService complianceAuditLogService;

  @Autowired private SseTelemetryService sseTelemetryService;

  public List<SettlementBatch> getAllBatches() {
    return settlementBatchRepository.findAllByOrderByCreatedAtDesc();
  }

  public Optional<SettlementBatch> findById(Long id) {
    return settlementBatchRepository.findById(id);
  }

  public List<SettlementBatchItem> getBatchItems(Long batchId) {
    return settlementBatchItemRepository.findByBatchIdOrderByRowNumberAsc(batchId);
  }

  public Map<String, Object> getBatchDetails(Long batchId) {
    Optional<SettlementBatch> batchOpt = settlementBatchRepository.findById(batchId);
    if (batchOpt.isEmpty()) {
      return null;
    }
    SettlementBatch batch = batchOpt.get();
    List<SettlementBatchItem> items =
        settlementBatchItemRepository.findByBatchIdOrderByRowNumberAsc(batchId);

    Map<String, Object> details = new HashMap<>();
    details.put("batch", batch);
    details.put("items", items);
    return details;
  }

  /** Computes the SHA-256 hex checksum of raw byte content. */
  public String computeSha256(byte[] data) {
    try {
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      byte[] hash = md.digest(data);
      return HexFormat.of().formatHex(hash);
    } catch (NoSuchAlgorithmException e) {
      throw new RuntimeException("SHA-256 algorithm not available", e);
    }
  }

  /**
   * Uploads and executes a payout batch with SHA-256 deduplication and partial-failure isolation.
   */
  public Map<String, Object> processBatchUpload(
      String fileName,
      Long sourceAccountId,
      byte[] fileBytes,
      List<Map<String, Object>> rawRows,
      String userName) {

    String fileHash = computeSha256(fileBytes);

    // 1. Idempotent Deduplication Check
    Optional<SettlementBatch> existingBatch =
        settlementBatchRepository.findByFileSha256Hash(fileHash);
    if (existingBatch.isPresent()) {
      throw new IllegalStateException(
          "DUPLICATE_BATCH_DETECTED: A batch file with identical SHA-256 checksum ("
              + fileHash
              + ") was already uploaded and processed under reference "
              + existingBatch.get().getBatchReference());
    }

    // 2. Validate Source Account
    TreasuryAccount sourceAccount =
        treasuryAccountRepository
            .findById(sourceAccountId)
            .orElseThrow(
                () ->
                    new IllegalArgumentException(
                        "Source treasury account not found: " + sourceAccountId));

    // 3. Create Staged Batch Record
    String batchRef =
        "BATCH-"
            + System.currentTimeMillis()
            + "-"
            + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

    SettlementBatch batch =
        new SettlementBatch(
            batchRef,
            userName,
            fileName != null ? fileName : "bulk_payout.csv",
            fileHash,
            sourceAccountId,
            rawRows.size());
    batch = settlementBatchRepository.save(batch);

    log.info(
        "Initiating batch payout {} with {} rows for user {}", batchRef, rawRows.size(), userName);

    // 4. Concurrently Execute Items across bounded Virtual Thread Semaphore (Semaphore 4 for pool
    // safety)
    Semaphore semaphore = new Semaphore(4);
    List<SettlementBatchItem> completedItems = new ArrayList<>();

    try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
      List<CompletableFuture<SettlementBatchItem>> futures = new ArrayList<>();

      for (int i = 0; i < rawRows.size(); i++) {
        final int rowNum = i + 1;
        final Map<String, Object> rowMap = rawRows.get(i);
        final Long currentBatchId = batch.getId();
        final String currentBatchRef = batchRef;

        futures.add(
            CompletableFuture.supplyAsync(
                () -> {
                  try {
                    semaphore.acquire();
                    return executeSingleBatchRow(
                        currentBatchId, currentBatchRef, rowNum, sourceAccountId, rowMap, userName);
                  } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return recordFailedItem(
                        currentBatchId,
                        rowNum,
                        rowMap,
                        currentBatchRef + "-row-" + rowNum,
                        "Processing thread interrupted: " + ie.getMessage());
                  } finally {
                    semaphore.release();
                  }
                },
                executor));
      }

      CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

      for (var f : futures) {
        try {
          completedItems.add(f.get());
        } catch (Exception ex) {
          log.error("Failed to collect batch item future: {}", ex.getMessage());
        }
      }
    }

    // 5. Aggregate Batch Reconciliation Metrics
    int settled = 0;
    int held = 0;
    int failed = 0;
    BigDecimal totalSettledAmount = BigDecimal.ZERO;

    for (SettlementBatchItem item : completedItems) {
      if ("SETTLED".equals(item.getOutcomeStatus())) {
        settled++;
        if (item.getAmount() != null) {
          totalSettledAmount = totalSettledAmount.add(item.getAmount());
        }
      } else if ("PENDING_HOLD".equals(item.getOutcomeStatus())) {
        held++;
      } else {
        failed++;
      }
    }

    batch.setSettledCount(settled);
    batch.setHeldAmlCount(held);
    batch.setFailedCount(failed);
    batch.setTotalSettledAmount(totalSettledAmount.setScale(4, RoundingMode.HALF_UP));
    batch.setCompletedAt(LocalDateTime.now());

    if (failed == rawRows.size()) {
      batch.setStatus("FAILED");
    } else if (held > 0) {
      batch.setStatus("COMPLETED_WITH_HOLDS");
    } else if (failed > 0) {
      batch.setStatus("COMPLETED_WITH_FAILURES");
    } else {
      batch.setStatus("COMPLETED");
    }

    SettlementBatch savedBatch = settlementBatchRepository.save(batch);

    complianceAuditLogService.recordAuditEvent(
        userName, "SETTLEMENT_BATCH_COMPLETED", savedBatch.getId(), savedBatch);

    if (sseTelemetryService != null) {
      sseTelemetryService.broadcast(
          "BATCH_PROGRESS",
          Map.of(
              "batchId",
              savedBatch.getId(),
              "batchRef",
              savedBatch.getBatchReference(),
              "status",
              savedBatch.getStatus(),
              "settled",
              settled,
              "held",
              held,
              "failed",
              failed));
    }

    log.info(
        "Settlement batch {} completed: settled={}, held={}, failed={}, volume={}",
        savedBatch.getBatchReference(),
        settled,
        held,
        failed,
        totalSettledAmount);

    Map<String, Object> result = new HashMap<>();
    result.put("batch", savedBatch);
    result.put("items", completedItems);
    result.put(
        "summary",
        String.format(
            "Batch %s: %d settled, %d held for AML review, %d failed out of %d total rows. Settled volume: $%s",
            savedBatch.getBatchReference(),
            settled,
            held,
            failed,
            savedBatch.getTotalRows(),
            totalSettledAmount.toPlainString()));

    return result;
  }

  /**
   * Executes a single row within its own isolated error boundary. If this row fails or triggers an
   * AML hold, it does NOT roll back any other row in the batch.
   */
  public SettlementBatchItem executeSingleBatchRow(
      Long batchId,
      String batchRef,
      int rowNumber,
      Long sourceAccountId,
      Map<String, Object> rowMap,
      String userName) {

    String idempotencyKey = (String) rowMap.get("idempotencyKey");
    if (idempotencyKey == null || idempotencyKey.trim().isEmpty()) {
      idempotencyKey = batchRef + "-row-" + rowNumber;
    }

    Long destinationAccountId = null;
    Object destObj = rowMap.get("destinationAccountId");
    if (destObj instanceof Number) {
      destinationAccountId = ((Number) destObj).longValue();
    } else if (destObj instanceof String) {
      String destStr = (String) destObj;
      try {
        destinationAccountId = Long.parseLong(destStr.trim());
      } catch (NumberFormatException nfe) {
        // Look up by account number
        Optional<TreasuryAccount> accByNum =
            treasuryAccountRepository.findByAccountNumber(destStr.trim());
        if (accByNum.isPresent()) {
          destinationAccountId = accByNum.get().getId();
        }
      }
    }

    BigDecimal amount = null;
    Object amountObj = rowMap.get("amount");
    if (amountObj instanceof Number) {
      amount = BigDecimal.valueOf(((Number) amountObj).doubleValue());
    } else if (amountObj instanceof String) {
      try {
        amount = new BigDecimal((String) amountObj);
      } catch (Exception ignored) {
      }
    }

    String currency = (String) rowMap.get("currency");
    if (currency == null || currency.trim().isEmpty()) {
      currency = "USD";
    }

    String description = (String) rowMap.get("description");
    if (description == null || description.trim().isEmpty()) {
      description = "Batch Payout Row #" + rowNumber;
    }

    // Basic format validation
    if (destinationAccountId == null) {
      return recordFailedItem(
          batchId, rowNumber, rowMap, idempotencyKey, "Invalid or missing destinationAccountId");
    }
    if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
      return recordFailedItem(
          batchId, rowNumber, rowMap, idempotencyKey, "Transfer amount must be strictly positive");
    }

    Optional<TreasuryAccount> destAccOpt = treasuryAccountRepository.findById(destinationAccountId);
    if (destAccOpt.isEmpty()) {
      return recordFailedItem(
          batchId,
          rowNumber,
          rowMap,
          idempotencyKey,
          "Destination treasury account ID " + destinationAccountId + " does not exist");
    }

    // Build Journal Entry
    JournalEntry entry = new JournalEntry();
    entry.setIdempotencyKey(idempotencyKey);
    entry.setSourceAccountId(sourceAccountId);
    entry.setDestinationAccountId(destinationAccountId);
    entry.setAmount(amount.setScale(4, RoundingMode.HALF_UP));
    entry.setCurrency(currency);
    entry.setReferenceType("BATCH_PAYOUT");
    entry.setTitle("Batch " + batchRef + " Row #" + rowNumber);
    entry.setContent(description);

    try {
      // Risk Checks: Redis velocity & 5-hop recursive CTE graph
      String velocityRisk = velocityRiskService.evaluateTransferRisk(entry);
      String graphRisk =
          amlGraphDetectionService.evaluateTransferGraphRisk(
              sourceAccountId, destinationAccountId, amount);

      String riskReason = null;
      if (velocityRisk != null && graphRisk != null) {
        riskReason = velocityRisk + "; " + graphRisk;
      } else if (velocityRisk != null) {
        riskReason = velocityRisk;
      } else if (graphRisk != null) {
        riskReason = graphRisk;
      }

      boolean holdForAml = (riskReason != null);

      // Save via double-entry journal service
      journalEntryService.saveEntry(entry, userName, holdForAml, riskReason);

      SettlementBatchItem item = new SettlementBatchItem();
      item.setBatchId(batchId);
      item.setRowNumber(rowNumber);
      item.setDestinationAccountId(destinationAccountId);
      item.setAmount(amount.setScale(4, RoundingMode.HALF_UP));
      item.setCurrency(currency);
      item.setDescription(description);
      item.setIdempotencyKey(idempotencyKey);
      item.setJournalEntryId(entry.getId());
      item.setProcessedAt(LocalDateTime.now());

      if (holdForAml) {
        item.setOutcomeStatus("PENDING_HOLD");
        item.setFailureOrHoldReason("Held for AML investigation: " + riskReason);
      } else {
        item.setOutcomeStatus("SETTLED");
      }

      return settlementBatchItemRepository.save(item);

    } catch (Exception e) {
      log.warn("Batch row #{} failed gracefully: {}", rowNumber, e.getMessage());
      return recordFailedItem(batchId, rowNumber, rowMap, idempotencyKey, e.getMessage());
    }
  }

  private SettlementBatchItem recordFailedItem(
      Long batchId,
      int rowNumber,
      Map<String, Object> rowMap,
      String idempotencyKey,
      String reason) {

    Long destId = null;
    Object destObj = rowMap.get("destinationAccountId");
    if (destObj instanceof Number) {
      destId = ((Number) destObj).longValue();
    } else if (destObj instanceof String) {
      try {
        destId = Long.parseLong((String) destObj);
      } catch (Exception ignored) {
      }
    }
    if (destId == null) {
      destId = 1L; // fallback placeholder for foreign key safety
    }

    BigDecimal amount = BigDecimal.ZERO;
    Object amountObj = rowMap.get("amount");
    if (amountObj instanceof Number) {
      amount = BigDecimal.valueOf(((Number) amountObj).doubleValue());
    } else if (amountObj instanceof String) {
      try {
        amount = new BigDecimal((String) amountObj);
      } catch (Exception ignored) {
      }
    }

    String currency = (String) rowMap.get("currency");
    if (currency == null) {
      currency = "USD";
    }

    String desc = (String) rowMap.get("description");

    SettlementBatchItem item = new SettlementBatchItem();
    item.setBatchId(batchId);
    item.setRowNumber(rowNumber);
    item.setDestinationAccountId(destId);
    item.setAmount(amount.setScale(4, RoundingMode.HALF_UP));
    item.setCurrency(currency);
    item.setDescription(desc != null ? desc : "Failed Batch Row #" + rowNumber);
    item.setIdempotencyKey(idempotencyKey);
    item.setOutcomeStatus("FAILED");
    item.setFailureOrHoldReason(reason);
    item.setProcessedAt(LocalDateTime.now());

    return settlementBatchItemRepository.save(item);
  }

  /**
   * Generates and executes a realistic 15-row corporate payroll & vendor batch containing: - 13
   * clean payouts (domestic USD + cross-currency FX) - 1 high-value AML velocity hold ($15,000.00
   * >= $10,000 threshold -> PENDING_HOLD) - 1 overdrawn payout ($9,999,999.00 -> FAILED
   * Insufficient available balance)
   */
  public Map<String, Object> generateSampleBatch(String userName) {
    log.info("Generating 15-row demo corporate payroll batch for user {}", userName);

    // 1. Ensure user and well-funded source account
    User user = userService.findByUserName(userName);
    if (user == null) {
      throw new IllegalStateException("User not found: " + userName);
    }

    TreasuryAccount sourceAccount;
    if (user.getTreasuryAccounts() != null && !user.getTreasuryAccounts().isEmpty()) {
      sourceAccount = user.getTreasuryAccounts().get(0);
      if (sourceAccount.getAvailableBalance().compareTo(BigDecimal.valueOf(50000)) < 0) {
        sourceAccount.setAvailableBalance(BigDecimal.valueOf(100000.0000));
        BigDecimal held =
            sourceAccount.getHeldBalance() != null
                ? sourceAccount.getHeldBalance()
                : BigDecimal.ZERO;
        sourceAccount.setPostedBalance(sourceAccount.getAvailableBalance().add(held));
        sourceAccount = treasuryAccountRepository.save(sourceAccount);
      }
    } else {
      sourceAccount = new TreasuryAccount();
      sourceAccount.setUserId(user.getId());
      sourceAccount.setAccountNumber("AC-CORP-PAYROLL-" + System.currentTimeMillis());
      sourceAccount.setCurrency("USD");
      sourceAccount.setStatus("ACTIVE");
      sourceAccount.setPostedBalance(BigDecimal.valueOf(100000.0000));
      sourceAccount.setAvailableBalance(BigDecimal.valueOf(100000.0000));
      sourceAccount.setHeldBalance(BigDecimal.ZERO);
      sourceAccount = treasuryAccountRepository.save(sourceAccount);
      user.getTreasuryAccounts().add(sourceAccount);
      userService.saveUser(user);
    }

    // 2. Ensure destination counterparty accounts exist
    TreasuryAccount bobAcc =
        ensureAccountForUser("bob", "AC-BOB-USD", "USD", BigDecimal.valueOf(1000));
    TreasuryAccount charlieAcc =
        ensureAccountForUser("charlie", "AC-CHARLIE-USD", "USD", BigDecimal.valueOf(1000));
    TreasuryAccount eurVendor =
        ensureSystemAccount("AC-CORP-EUR-VENDOR", "EUR", BigDecimal.valueOf(50000));
    TreasuryAccount inrVendor =
        ensureSystemAccount("AC-CORP-INR-VENDOR", "INR", BigDecimal.valueOf(5000000));
    TreasuryAccount gbpVendor =
        ensureSystemAccount("AC-CORP-GBP-VENDOR", "GBP", BigDecimal.valueOf(50000));

    // 3. Construct 15 realistic items
    long ts = System.currentTimeMillis();
    List<Map<String, Object>> rows = new ArrayList<>();

    rows.add(
        createRowMap(1, bobAcc.getId(), 4200.00, "USD", "Engineering Lead Bi-Weekly Salary", ts));
    rows.add(
        createRowMap(
            2, charlieAcc.getId(), 3800.00, "USD", "Product Manager Bi-Weekly Salary", ts));
    rows.add(
        createRowMap(
            3, eurVendor.getId(), 2500.00, "EUR", "Cloud Infrastructure EU Datacenter", ts));
    rows.add(createRowMap(4, inrVendor.getId(), 1800.00, "INR", "UI/UX Mobile Design Agency", ts));
    rows.add(
        createRowMap(5, bobAcc.getId(), 650.00, "USD", "Health & Wellness Monthly Stipend", ts));
    rows.add(createRowMap(6, charlieAcc.getId(), 1100.00, "USD", "Q3 Performance Team Bonus", ts));
    // Row 7: High Value Hold ($15,000 >= $10,000 threshold -> PENDING_HOLD)
    rows.add(
        createRowMap(
            7, bobAcc.getId(), 15000.00, "USD", "Executive Strategic Retention Bonus", ts));
    rows.add(
        createRowMap(8, gbpVendor.getId(), 3200.00, "GBP", "UK Cross-Border Legal Retainer", ts));
    rows.add(
        createRowMap(9, charlieAcc.getId(), 950.00, "USD", "Hardware Laptop Reimbursement", ts));
    rows.add(createRowMap(10, eurVendor.getId(), 4100.00, "EUR", "Fiber Transit Bandwidth EU", ts));
    rows.add(
        createRowMap(11, bobAcc.getId(), 2300.00, "USD", "Growth Marketing Campaign Payout", ts));
    rows.add(
        createRowMap(12, inrVendor.getId(), 1400.00, "INR", "Security Penetration Testing", ts));
    rows.add(
        createRowMap(
            13, charlieAcc.getId(), 800.00, "USD", "Developer Conference Travel Expense", ts));
    rows.add(createRowMap(14, bobAcc.getId(), 1750.00, "USD", "Technical Advisory Consulting", ts));
    // Row 15: Huge Amount ($9,999,999.00 -> FAILED Insufficient Funds)
    rows.add(
        createRowMap(
            15, charlieAcc.getId(), 9999999.00, "USD", "Escrow Acquisition Overdrawn", ts));

    // Construct mock CSV bytes with timestamp to guarantee distinct SHA-256 hash
    StringBuilder csvBuilder = new StringBuilder();
    csvBuilder.append("row_number,destination_account_id,amount,currency,description,timestamp\n");
    for (Map<String, Object> r : rows) {
      csvBuilder
          .append(r.get("rowNumber"))
          .append(",")
          .append(r.get("destinationAccountId"))
          .append(",")
          .append(r.get("amount"))
          .append(",")
          .append(r.get("currency"))
          .append(",\"")
          .append(r.get("description"))
          .append("\",")
          .append(ts)
          .append("\n");
    }

    byte[] csvBytes = csvBuilder.toString().getBytes(StandardCharsets.UTF_8);
    String fileName = "sample_corporate_payroll_" + ts + ".csv";

    return processBatchUpload(fileName, sourceAccount.getId(), csvBytes, rows, userName);
  }

  private Map<String, Object> createRowMap(
      int rowNumber,
      Long destinationAccountId,
      double amount,
      String currency,
      String description,
      long timestamp) {
    Map<String, Object> map = new HashMap<>();
    map.put("rowNumber", rowNumber);
    map.put("destinationAccountId", destinationAccountId);
    map.put("amount", BigDecimal.valueOf(amount));
    map.put("currency", currency);
    map.put("description", description);
    map.put("idempotencyKey", "sample-batch-" + timestamp + "-row-" + rowNumber);
    return map;
  }

  private TreasuryAccount ensureAccountForUser(
      String targetUserName, String accountNumber, String currency, BigDecimal initialBalance) {
    User user = userService.findByUserName(targetUserName);
    if (user != null
        && user.getTreasuryAccounts() != null
        && !user.getTreasuryAccounts().isEmpty()) {
      return user.getTreasuryAccounts().get(0);
    }
    Optional<TreasuryAccount> opt = treasuryAccountRepository.findByAccountNumber(accountNumber);
    if (opt.isPresent()) {
      return opt.get();
    }
    TreasuryAccount acc = new TreasuryAccount();
    if (user != null) {
      acc.setUserId(user.getId());
    }
    acc.setAccountNumber(accountNumber);
    acc.setCurrency(currency);
    acc.setStatus("ACTIVE");
    acc.setPostedBalance(initialBalance);
    acc.setAvailableBalance(initialBalance);
    acc.setHeldBalance(BigDecimal.ZERO);
    return treasuryAccountRepository.save(acc);
  }

  private TreasuryAccount ensureSystemAccount(
      String accountNumber, String currency, BigDecimal balance) {
    Optional<TreasuryAccount> opt = treasuryAccountRepository.findByAccountNumber(accountNumber);
    if (opt.isPresent()) {
      return opt.get();
    }
    TreasuryAccount acc = new TreasuryAccount();
    acc.setAccountNumber(accountNumber);
    acc.setCurrency(currency);
    acc.setStatus("ACTIVE");
    acc.setPostedBalance(balance);
    acc.setAvailableBalance(balance);
    acc.setHeldBalance(BigDecimal.ZERO);
    return treasuryAccountRepository.save(acc);
  }

  /** Helper to parse CSV string into list of row maps. */
  public List<Map<String, Object>> parseCsv(String csvContent) {
    List<Map<String, Object>> rows = new ArrayList<>();
    if (csvContent == null || csvContent.trim().isEmpty()) {
      return rows;
    }

    String[] lines = csvContent.split("\r?\n");
    int rowCount = 0;

    for (String line : lines) {
      String trimmed = line.trim();
      if (trimmed.isEmpty() || trimmed.startsWith("#")) {
        continue;
      }

      // Skip header line if detected
      if (trimmed.toLowerCase().contains("destination")
          || trimmed.toLowerCase().contains("amount")) {
        continue;
      }

      // Simple CSV split handling quotes
      String[] parts = trimmed.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");
      if (parts.length >= 2) {
        rowCount++;
        Map<String, Object> map = new HashMap<>();
        map.put("rowNumber", rowCount);

        try {
          String p0 = parts[0].replaceAll("\"", "").trim();
          String p1 = parts[1].replaceAll("\"", "").trim();

          // Check if first column is row_number or destination_account_id
          if (parts.length >= 3 && isNumeric(p0) && (isNumeric(p1) || p1.startsWith("AC-"))) {
            map.put("destinationAccountId", p1);
            map.put("amount", new BigDecimal(parts[2].replaceAll("\"", "").trim()));
            if (parts.length >= 4) {
              map.put("currency", parts[3].replaceAll("\"", "").trim());
            }
            if (parts.length >= 5) {
              map.put("description", parts[4].replaceAll("\"", "").trim());
            }
          } else {
            map.put("destinationAccountId", p0);
            map.put("amount", new BigDecimal(p1));
            if (parts.length >= 3) {
              map.put("currency", parts[2].replaceAll("\"", "").trim());
            }
            if (parts.length >= 4) {
              map.put("description", parts[3].replaceAll("\"", "").trim());
            }
          }
          rows.add(map);
        } catch (Exception ex) {
          log.warn("Skipping invalid CSV line: '{}' ({})", trimmed, ex.getMessage());
        }
      }
    }
    return rows;
  }

  private boolean isNumeric(String str) {
    if (str == null) return false;
    try {
      Long.parseLong(str);
      return true;
    } catch (NumberFormatException e) {
      return false;
    }
  }
}
