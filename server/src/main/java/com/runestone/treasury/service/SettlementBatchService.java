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
