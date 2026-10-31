package com.runestone.treasury.repository;

import static org.junit.jupiter.api.Assertions.*;

import com.runestone.treasury.entity.JournalEntry;
import com.runestone.treasury.entity.PostingLeg;
import com.runestone.treasury.entity.TreasuryAccount;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class PostingLegRepositoryImplTests {

  @Autowired private PostingLegRepository postingLegRepository;

  @Autowired private JournalEntryRepository journalEntryRepository;

  @Autowired private TreasuryAccountRepository treasuryAccountRepository;

  @Test
  void testSaveAndFindByJournalEntryId() {
    TreasuryAccount acc1 = new TreasuryAccount();
    acc1.setAccountNumber("PL-ACC-1-" + System.currentTimeMillis());
    acc1.setAvailableBalance(new BigDecimal("1000.0000"));
    acc1.setHeldBalance(BigDecimal.ZERO);
    acc1.setPostedBalance(new BigDecimal("1000.0000"));
    acc1 = treasuryAccountRepository.save(acc1);

    TreasuryAccount acc2 = new TreasuryAccount();
    acc2.setAccountNumber("PL-ACC-2-" + System.currentTimeMillis());
    acc2.setAvailableBalance(new BigDecimal("500.0000"));
    acc2.setHeldBalance(BigDecimal.ZERO);
    acc2.setPostedBalance(new BigDecimal("500.0000"));
    acc2 = treasuryAccountRepository.save(acc2);

    JournalEntry journal = new JournalEntry();
    journal.setIdempotencyKey("pl-test-key-" + System.currentTimeMillis());
    journal.setSourceAccountId(acc1.getId());
    journal.setDestinationAccountId(acc2.getId());
    journal.setAmount(new BigDecimal("100.0000"));
    journal.setStatus("SETTLED");
    journal.setDate(LocalDateTime.now());
    journal = journalEntryRepository.save(journal);

    PostingLeg leg =
        new PostingLeg(
            journal.getId(),
            acc1.getId(),
            acc2.getId(),
            "DEBIT",
            new BigDecimal("100.0000"),
            new BigDecimal("-100.0000"),
            new BigDecimal("900.0000"));
    postingLegRepository.save(leg);

    List<PostingLeg> found = postingLegRepository.findByJournalEntryId(journal.getId());
    assertFalse(found.isEmpty());
    assertEquals("DEBIT", found.get(0).getLegType());
    assertEquals(0, new BigDecimal("100.0000").compareTo(found.get(0).getAmount()));
  }
}
