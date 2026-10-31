package com.runestone.treasury.service;

import com.runestone.treasury.entity.BalanceHold;
import com.runestone.treasury.entity.JournalEntry;
import com.runestone.treasury.entity.PostingLeg;
import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.repository.BalanceHoldRepository;
import com.runestone.treasury.repository.JournalEntryRepository;
import com.runestone.treasury.repository.PostingLegRepository;
import com.runestone.treasury.repository.TreasuryAccountRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BalanceHoldService {

  private static final Logger log = LoggerFactory.getLogger(BalanceHoldService.class);

  @Autowired private BalanceHoldRepository balanceHoldRepository;

  @Autowired private TreasuryAccountRepository treasuryAccountRepository;

  @Autowired private JournalEntryRepository journalEntryRepository;

  @Autowired private PostingLegRepository postingLegRepository;

  public List<BalanceHold> getAll() {
    return balanceHoldRepository.findAll();
  }

  public Optional<BalanceHold> findById(Long id) {
    return balanceHoldRepository.findById(id);
  }

  public Optional<BalanceHold> findByIdempotencyKey(String key) {
    return balanceHoldRepository.findByIdempotencyKey(key);
  }

  public List<BalanceHold> findPendingHolds() {
    return balanceHoldRepository.findByStatus("PENDING_HOLD");
  }

  public BalanceHold save(BalanceHold hold) {
    return balanceHoldRepository.save(hold);
  }

  @Transactional
  public BalanceHold releaseAndReverseHold(Long holdId) {
    BalanceHold hold =
        balanceHoldRepository
            .findById(holdId)
            .orElseThrow(() -> new IllegalStateException("Balance hold not found: " + holdId));

    if (!"PENDING_HOLD".equals(hold.getStatus())) {
      throw new IllegalStateException("Hold is not in PENDING_HOLD state: " + hold.getStatus());
    }

    TreasuryAccount source =
        treasuryAccountRepository
            .findById(hold.getSourceAccountId())
            .orElseThrow(
                () ->
                    new IllegalStateException(
                        "Source account not found: " + hold.getSourceAccountId()));

    BigDecimal amount = hold.getAmount();
    // Return held balance back to available balance on source account
    source.setHeldBalance(source.getHeldBalance().subtract(amount));
    source.setAvailableBalance(source.getAvailableBalance().add(amount));
    source.setPostedBalance(source.getAvailableBalance().add(source.getHeldBalance()));
    source.setUpdatedAt(LocalDateTime.now());
    treasuryAccountRepository.save(source);

    hold.setStatus("RELEASED_REVERSED");
    BalanceHold savedHold = balanceHoldRepository.save(hold);

    if (hold.getIdempotencyKey() != null) {
      journalEntryRepository
          .findByIdempotencyKey(hold.getIdempotencyKey())
          .ifPresent(
              je -> {
                je.setStatus("REVERSED");
                journalEntryRepository.save(je);
              });
    }

    log.info("Balance hold {} reversed back to source account {}", holdId, source.getId());
    return savedHold;
  }

  @Transactional
  public BalanceHold settleHold(Long holdId) {
    BalanceHold hold =
        balanceHoldRepository
            .findById(holdId)
            .orElseThrow(() -> new IllegalStateException("Balance hold not found: " + holdId));

    if (!"PENDING_HOLD".equals(hold.getStatus())) {
      throw new IllegalStateException("Hold is not in PENDING_HOLD state: " + hold.getStatus());
    }

    TreasuryAccount source =
        treasuryAccountRepository
            .findById(hold.getSourceAccountId())
            .orElseThrow(
                () ->
                    new IllegalStateException(
                        "Source account not found: " + hold.getSourceAccountId()));

    TreasuryAccount destination =
        treasuryAccountRepository
            .findById(hold.getDestinationAccountId())
            .orElseThrow(
                () ->
                    new IllegalStateException(
                        "Destination account not found: " + hold.getDestinationAccountId()));

    BigDecimal amount = hold.getAmount();

    // Settle hold: decrement source held_balance and debit source posted_balance
    source.setHeldBalance(source.getHeldBalance().subtract(amount));
    source.setPostedBalance(source.getAvailableBalance().add(source.getHeldBalance()));
    source.setUpdatedAt(LocalDateTime.now());

    // Credit destination account
    destination.setAvailableBalance(destination.getAvailableBalance().add(amount));
    destination.setPostedBalance(
        destination.getAvailableBalance().add(destination.getHeldBalance()));
    destination.setUpdatedAt(LocalDateTime.now());

    treasuryAccountRepository.save(source);
    treasuryAccountRepository.save(destination);

    hold.setStatus("RESOLVED_SETTLED");
    BalanceHold savedHold = balanceHoldRepository.save(hold);

    Long journalEntryId = null;
    if (hold.getIdempotencyKey() != null) {
      Optional<JournalEntry> jeOpt =
          journalEntryRepository.findByIdempotencyKey(hold.getIdempotencyKey());
      if (jeOpt.isPresent()) {
        JournalEntry je = jeOpt.get();
        je.setStatus("SETTLED");
        journalEntryRepository.save(je);
        journalEntryId = je.getId();
      }
    }

    if (journalEntryId != null) {
      PostingLeg debitLeg =
          new PostingLeg(
              journalEntryId,
              source.getId(),
              destination.getId(),
              "DEBIT",
              amount,
              amount.negate(),
              source.getPostedBalance());
      PostingLeg creditLeg =
          new PostingLeg(
              journalEntryId,
              destination.getId(),
              source.getId(),
              "CREDIT",
              amount,
              amount,
              destination.getPostedBalance());
      postingLegRepository.save(debitLeg);
      postingLegRepository.save(creditLeg);
    }

    log.info(
        "Balance hold {} settled: source={} debited, destination={} credited",
        holdId,
        source.getId(),
        destination.getId());
    return savedHold;
  }
}
