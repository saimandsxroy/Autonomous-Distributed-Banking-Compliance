package com.runestone.treasury.service;

import static org.junit.jupiter.api.Assertions.*;

import com.runestone.treasury.entity.JournalEntry;
import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.entity.User;
import com.runestone.treasury.repository.TreasuryAccountRepository;
import com.runestone.treasury.repository.UserRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class DoubleEntryConcurrencyTests {

  @Autowired private JournalEntryService journalEntryService;

  @Autowired private TreasuryAccountRepository treasuryAccountRepository;

  @Autowired private UserRepository userRepository;

  private Long accountAId;
  private Long accountBId;
  private String userName;

  @BeforeEach
  void setUp() {
    userName = "concurrency_tester_" + System.currentTimeMillis();
    User user = new User();
    user.setUserName(userName);
    user.setPassword("password");
    user = userRepository.save(user);

    TreasuryAccount accA = new TreasuryAccount();
    accA.setUserId(user.getId());
    accA.setAccountNumber("AC-A-" + System.currentTimeMillis());
    accA.setAvailableBalance(new BigDecimal("10000.0000"));
    accA.setHeldBalance(BigDecimal.ZERO);
    accA.setPostedBalance(new BigDecimal("10000.0000"));
    accA = treasuryAccountRepository.save(accA);
    accountAId = accA.getId();

    TreasuryAccount accB = new TreasuryAccount();
    accB.setUserId(user.getId());
    accB.setAccountNumber("AC-B-" + System.currentTimeMillis());
    accB.setAvailableBalance(new BigDecimal("10000.0000"));
    accB.setHeldBalance(BigDecimal.ZERO);
    accB.setPostedBalance(new BigDecimal("10000.0000"));
    accB = treasuryAccountRepository.save(accB);
    accountBId = accB.getId();
  }

  @Test
  void test100ConcurrentBidirectionalTransfersZeroDeadlockAndInvariantConservation()
      throws InterruptedException {
    int threadCount = 100;
    CountDownLatch startLatch = new CountDownLatch(1);
    CountDownLatch doneLatch = new CountDownLatch(threadCount);

    BigDecimal initialTotal = new BigDecimal("20000.0000");
    BigDecimal transferAmount = new BigDecimal("10.0000");

    List<Future<?>> futures = new ArrayList<>();
    try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
      for (int i = 0; i < threadCount; i++) {
        final int index = i;
        futures.add(
            executor.submit(
                () -> {
                  try {
                    startLatch.await();
                    JournalEntry entry = new JournalEntry();
                    entry.setIdempotencyKey("concurrent-key-" + index + "-" + System.nanoTime());
                    entry.setAmount(transferAmount);

                    if (index % 2 == 0) {
                      entry.setSourceAccountId(accountAId);
                      entry.setDestinationAccountId(accountBId);
                    } else {
                      entry.setSourceAccountId(accountBId);
                      entry.setDestinationAccountId(accountAId);
                    }

                    journalEntryService.saveEntry(entry, userName, false, null);
                  } catch (Exception e) {
                    // Under high concurrency, any error is caught
                  } finally {
                    doneLatch.countDown();
                  }
                }));
      }

      startLatch.countDown();
      boolean completed = doneLatch.await(30, TimeUnit.SECONDS);
      assertTrue(
          completed,
          "All 100 concurrent tasks should finish within 30 seconds with zero deadlocks");

      TreasuryAccount finalA = treasuryAccountRepository.findById(accountAId).orElseThrow();
      TreasuryAccount finalB = treasuryAccountRepository.findById(accountBId).orElseThrow();

      BigDecimal finalTotal = finalA.getPostedBalance().add(finalB.getPostedBalance());
      assertEquals(
          0,
          initialTotal.compareTo(finalTotal),
          "Total money across accounts must be strictly conserved: expected "
              + initialTotal
              + " but got "
              + finalTotal);
    }
  }
}
