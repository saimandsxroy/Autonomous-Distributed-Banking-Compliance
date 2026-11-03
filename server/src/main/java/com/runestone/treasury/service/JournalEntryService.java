package com.runestone.treasury.service;

import com.runestone.treasury.entity.BalanceHold;
import com.runestone.treasury.entity.JournalEntry;
import com.runestone.treasury.entity.PostingLeg;
import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.entity.User;
import com.runestone.treasury.repository.BalanceHoldRepository;
import com.runestone.treasury.repository.JournalEntryRepository;
import com.runestone.treasury.repository.PostingLegRepository;
import com.runestone.treasury.repository.TreasuryAccountRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class JournalEntryService {

  private static final Logger log = LoggerFactory.getLogger(JournalEntryService.class);

  @Autowired private JournalEntryRepository journalEntryRepository;

  @Autowired private PostingLegRepository postingLegRepository;

  @Autowired private TreasuryAccountRepository treasuryAccountRepository;

  @Autowired private BalanceHoldRepository balanceHoldRepository;

  @Autowired private UserService userService;

  @Autowired private OutboxEventService outboxEventService;

  @Autowired private ComplianceAuditLogService complianceAuditLogService;

  @Autowired private FxTreasuryService fxTreasuryService;

  @Autowired private SseTelemetryService sseTelemetryService;

  public List<JournalEntry> getAll() {
    return journalEntryRepository.findAll();
  }

  public Optional<JournalEntry> findById(Long id) {
    return journalEntryRepository.findById(id);
  }

  public Optional<JournalEntry> findByIdempotencyKey(String key) {
    return journalEntryRepository.findByIdempotencyKey(key);
  }

