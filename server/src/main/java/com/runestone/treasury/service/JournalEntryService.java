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

  @Transactional
  public void saveEntry(
      JournalEntry myEntry, String userName, boolean holdForAml, String riskReason) {
    try {
      User user = userService.findByUserName(userName);
      if (user == null) {
        throw new IllegalStateException("User not found: " + userName);
      }

      Long firstLockId = Math.min(myEntry.getSourceAccountId(), myEntry.getDestinationAccountId());
      Long secondLockId = Math.max(myEntry.getSourceAccountId(), myEntry.getDestinationAccountId());

      List<TreasuryAccount> locked =
          treasuryAccountRepository.lockAccountsInOrder(Arrays.asList(firstLockId, secondLockId));

      if (locked.size() != 2) {
        throw new IllegalStateException("Source or destination treasury account not found");
      }

      TreasuryAccount source =
          locked.get(0).getId().equals(myEntry.getSourceAccountId())
              ? locked.get(0)
              : locked.get(1);
      TreasuryAccount destination =
          locked.get(0).getId().equals(myEntry.getDestinationAccountId())
              ? locked.get(0)
              : locked.get(1);

      BigDecimal amount = myEntry.getAmount();
      if (source.getAvailableBalance().compareTo(amount) < 0) {
        throw new IllegalStateException("Insufficient available balance");
      }

      myEntry.setUserId(user.getId());
      myEntry.setDate(LocalDateTime.now());
      if (myEntry.getCurrency() == null) {
        myEntry.setCurrency(source.getCurrency());
      }

      String srcCurrency = source.getCurrency().toUpperCase();
      String dstCurrency =
          (myEntry.getTargetCurrency() != null && !myEntry.getTargetCurrency().isBlank())
              ? myEntry.getTargetCurrency().toUpperCase()
              : destination.getCurrency().toUpperCase();

      boolean isCrossCurrency =
          !srcCurrency.equalsIgnoreCase(dstCurrency)
              || "CROSS_BORDER_FX".equalsIgnoreCase(myEntry.getReferenceType());

      if (!isCrossCurrency) {
        if (holdForAml) {
          source.setAvailableBalance(source.getAvailableBalance().subtract(amount));
          source.setHeldBalance(source.getHeldBalance().add(amount));
          treasuryAccountRepository.save(source);

          myEntry.setStatus("PENDING_HOLD");
          JournalEntry savedEntry = journalEntryRepository.save(myEntry);
          user.getJournalEntries().add(savedEntry);
          userService.saveUser(user);

          BalanceHold hold = new BalanceHold();
          hold.setIdempotencyKey(myEntry.getIdempotencyKey());
          hold.setSourceAccountId(source.getId());
          hold.setDestinationAccountId(destination.getId());
          hold.setAmount(amount);
          hold.setCurrency(myEntry.getCurrency());
          hold.setStatus("PENDING_HOLD");
          hold.setRiskReason(riskReason);
          hold.setExpiresAt(LocalDateTime.now().plusHours(24));
          hold.setCreatedAt(LocalDateTime.now());
          BalanceHold savedHold = balanceHoldRepository.save(hold);

          outboxEventService.recordEvent(
              "BalanceHold", savedHold.getId(), "transaction.flagged", savedHold);
          complianceAuditLogService.recordAuditEvent(
              userName, "BALANCE_HOLD_CREATED", savedHold.getId(), savedHold);

          if (sseTelemetryService != null) {
            sseTelemetryService.broadcast(
                "HOLD_FLAGGED",
                Map.of("holdId", savedHold.getId(), "amount", savedHold.getAmount()));
          }

          log.warn(
              "Transfer placed in PENDING_HOLD for user {}: key={}",
              userName,
              myEntry.getIdempotencyKey());
          return;
        }

        source.setAvailableBalance(source.getAvailableBalance().subtract(amount));
        source.setPostedBalance(source.getAvailableBalance().add(source.getHeldBalance()));

        destination.setAvailableBalance(destination.getAvailableBalance().add(amount));
        destination.setPostedBalance(
            destination.getAvailableBalance().add(destination.getHeldBalance()));

        treasuryAccountRepository.save(source);
        treasuryAccountRepository.save(destination);

        myEntry.setStatus("SETTLED");
        JournalEntry saved = journalEntryRepository.save(myEntry);

        PostingLeg debitLeg =
            new PostingLeg(
                saved.getId(),
                source.getId(),
                destination.getId(),
                "DEBIT",
                source.getCurrency(),
                amount,
                amount.negate(),
                source.getPostedBalance());
        PostingLeg creditLeg =
            new PostingLeg(
                saved.getId(),
                destination.getId(),
                source.getId(),
                "CREDIT",
                destination.getCurrency(),
                amount,
                amount,
                destination.getPostedBalance());

        BigDecimal netZeroCheck = debitLeg.getSignedAmount().add(creditLeg.getSignedAmount());
        if (netZeroCheck.compareTo(BigDecimal.ZERO) != 0) {
          throw new IllegalStateException("Double-entry invariant violated");
        }

        postingLegRepository.save(debitLeg);
        postingLegRepository.save(creditLeg);

        user.getJournalEntries().add(saved);
        userService.saveUser(user);

        outboxEventService.recordEvent(
            "JournalEntry", saved.getId(), "transaction.completed", saved);
        complianceAuditLogService.recordAuditEvent(
            userName, "JOURNAL_ENTRY_SETTLED", saved.getId(), saved);

        if (sseTelemetryService != null) {
          sseTelemetryService.broadcast(
              "TRANSFER_SETTLED", Map.of("journalId", saved.getId(), "amount", saved.getAmount()));
        }

        log.info(
            "Double-entry transfer settled successfully for user {}: journalId={}",
            userName,
            saved.getId());
      } else {
        // Cross-currency multi-leg FX settlement
        TreasuryAccount fxSourcePool = fxTreasuryService.getSystemFxAccount(srcCurrency);
        TreasuryAccount fxTargetPool = fxTreasuryService.getSystemFxAccount(dstCurrency);
        TreasuryAccount feeAccount = fxTreasuryService.getSystemFeeAccount(srcCurrency);

        List<Long> systemIds =
            Stream.of(fxSourcePool.getId(), fxTargetPool.getId(), feeAccount.getId())
                .filter(id -> !id.equals(source.getId()) && !id.equals(destination.getId()))
                .distinct()
                .sorted()
                .collect(Collectors.toList());

        List<TreasuryAccount> lockedSystemList =
            treasuryAccountRepository.lockAccountsInOrder(systemIds);
        Map<Long, TreasuryAccount> lockedMap =
            lockedSystemList.stream().collect(Collectors.toMap(TreasuryAccount::getId, a -> a));

        TreasuryAccount lockedFxSource = lockedMap.getOrDefault(fxSourcePool.getId(), fxSourcePool);
        TreasuryAccount lockedFxTarget = lockedMap.getOrDefault(fxTargetPool.getId(), fxTargetPool);
        TreasuryAccount lockedFeeAcc = lockedMap.getOrDefault(feeAccount.getId(), feeAccount);

        BigDecimal totalSourceAmount = amount;
        myEntry.setReferenceType("CROSS_BORDER_FX");

        if (holdForAml) {
          source.setAvailableBalance(source.getAvailableBalance().subtract(totalSourceAmount));
          source.setHeldBalance(source.getHeldBalance().add(totalSourceAmount));
          treasuryAccountRepository.save(source);

          myEntry.setStatus("PENDING_HOLD");
          JournalEntry savedEntry = journalEntryRepository.save(myEntry);
          user.getJournalEntries().add(savedEntry);
          userService.saveUser(user);

          BalanceHold hold = new BalanceHold();
          hold.setIdempotencyKey(myEntry.getIdempotencyKey());
          hold.setSourceAccountId(source.getId());
          hold.setDestinationAccountId(destination.getId());
          hold.setAmount(totalSourceAmount);
          hold.setCurrency(srcCurrency);
          hold.setStatus("PENDING_HOLD");
          hold.setRiskReason(riskReason);
          hold.setExpiresAt(LocalDateTime.now().plusHours(24));
          hold.setCreatedAt(LocalDateTime.now());
          BalanceHold savedHold = balanceHoldRepository.save(hold);

          outboxEventService.recordEvent(
              "BalanceHold", savedHold.getId(), "transaction.flagged", savedHold);
          complianceAuditLogService.recordAuditEvent(
              userName, "BALANCE_HOLD_CREATED", savedHold.getId(), savedHold);

          if (sseTelemetryService != null) {
            sseTelemetryService.broadcast(
                "HOLD_FLAGGED",
                Map.of("holdId", savedHold.getId(), "amount", savedHold.getAmount()));
          }

          log.warn(
              "Cross-currency FX transfer placed in PENDING_HOLD for user {}: key={}",
              userName,
              myEntry.getIdempotencyKey());
          return;
        }

        Map<String, Object> quote =
            fxTreasuryService.calculateQuote(srcCurrency, dstCurrency, totalSourceAmount);
        BigDecimal feeAmount = (BigDecimal) quote.get("feeAmount");
        BigDecimal netPrincipal = (BigDecimal) quote.get("netPrincipal");
        BigDecimal convertedTargetAmount = (BigDecimal) quote.get("convertedTargetAmount");

        // Leg 1 (Source Debit): -totalSourceAmount (srcCurrency)
        source.setAvailableBalance(source.getAvailableBalance().subtract(totalSourceAmount));
        source.setPostedBalance(source.getAvailableBalance().add(source.getHeldBalance()));

        // Leg 2 (System Fee Credit): +feeAmount (srcCurrency)
        lockedFeeAcc.setAvailableBalance(lockedFeeAcc.getAvailableBalance().add(feeAmount));
        lockedFeeAcc.setPostedBalance(
            lockedFeeAcc.getAvailableBalance().add(lockedFeeAcc.getHeldBalance()));

        // Leg 3 (Source FX Pool Credit): +netPrincipal (srcCurrency)
        lockedFxSource.setAvailableBalance(lockedFxSource.getAvailableBalance().add(netPrincipal));
        lockedFxSource.setPostedBalance(
            lockedFxSource.getAvailableBalance().add(lockedFxSource.getHeldBalance()));

        // Leg 4 (Target FX Pool Debit): -convertedTargetAmount (dstCurrency)
        lockedFxTarget.setAvailableBalance(
            lockedFxTarget.getAvailableBalance().subtract(convertedTargetAmount));
        lockedFxTarget.setPostedBalance(
            lockedFxTarget.getAvailableBalance().add(lockedFxTarget.getHeldBalance()));

        // Leg 5 (Destination Credit): +convertedTargetAmount (dstCurrency)
        destination.setAvailableBalance(
            destination.getAvailableBalance().add(convertedTargetAmount));
        destination.setPostedBalance(
            destination.getAvailableBalance().add(destination.getHeldBalance()));

        treasuryAccountRepository.save(source);
        treasuryAccountRepository.save(destination);
        treasuryAccountRepository.save(lockedFeeAcc);
        treasuryAccountRepository.save(lockedFxSource);
        treasuryAccountRepository.save(lockedFxTarget);

        myEntry.setStatus("SETTLED");
        JournalEntry saved = journalEntryRepository.save(myEntry);

        PostingLeg leg1 =
            new PostingLeg(
                saved.getId(),
                source.getId(),
                lockedFxSource.getId(),
                "DEBIT",
                srcCurrency,
                totalSourceAmount,
                totalSourceAmount.negate(),
                source.getPostedBalance());

        PostingLeg leg2 =
            new PostingLeg(
                saved.getId(),
                lockedFeeAcc.getId(),
                source.getId(),
                "CREDIT",
                srcCurrency,
                feeAmount,
                feeAmount,
                lockedFeeAcc.getPostedBalance());

        PostingLeg leg3 =
            new PostingLeg(
                saved.getId(),
                lockedFxSource.getId(),
                source.getId(),
                "CREDIT",
                srcCurrency,
                netPrincipal,
                netPrincipal,
                lockedFxSource.getPostedBalance());

        PostingLeg leg4 =
            new PostingLeg(
                saved.getId(),
                lockedFxTarget.getId(),
                destination.getId(),
                "DEBIT",
                dstCurrency,
                convertedTargetAmount,
                convertedTargetAmount.negate(),
                lockedFxTarget.getPostedBalance());

        PostingLeg leg5 =
            new PostingLeg(
                saved.getId(),
                destination.getId(),
                lockedFxTarget.getId(),
                "CREDIT",
                dstCurrency,
                convertedTargetAmount,
                convertedTargetAmount,
                destination.getPostedBalance());

        // Zero-sum invariant validation per currency
        BigDecimal srcSum =
            leg1.getSignedAmount().add(leg2.getSignedAmount()).add(leg3.getSignedAmount());
        if (srcSum.compareTo(BigDecimal.ZERO) != 0) {
          throw new IllegalStateException(
              "Double-entry zero-sum invariant violated for " + srcCurrency + ": " + srcSum);
        }

        BigDecimal dstSum = leg4.getSignedAmount().add(leg5.getSignedAmount());
        if (dstSum.compareTo(BigDecimal.ZERO) != 0) {
          throw new IllegalStateException(
              "Double-entry zero-sum invariant violated for " + dstCurrency + ": " + dstSum);
        }

        postingLegRepository.save(leg1);
        postingLegRepository.save(leg2);
        postingLegRepository.save(leg3);
        postingLegRepository.save(leg4);
        postingLegRepository.save(leg5);

        user.getJournalEntries().add(saved);
        userService.saveUser(user);

        outboxEventService.recordEvent(
            "JournalEntry", saved.getId(), "transaction.completed", saved);
        complianceAuditLogService.recordAuditEvent(
            userName, "JOURNAL_ENTRY_SETTLED_FX", saved.getId(), saved);

        if (sseTelemetryService != null) {
          sseTelemetryService.broadcast(
              "TRANSFER_SETTLED", Map.of("journalId", saved.getId(), "amount", saved.getAmount()));
        }

        log.info(
            "Cross-currency FX 5-leg transfer settled successfully for user {}: journalId={}, {} -> {}",
            userName,
            saved.getId(),
            srcCurrency,
            dstCurrency);
      }
    } catch (Exception e) {
      log.error(
          "Failed to execute double-entry transfer for user {}: {}", userName, e.getMessage());
      throw e;
    }
  }
}
