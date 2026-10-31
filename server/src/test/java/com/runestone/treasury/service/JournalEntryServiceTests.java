package com.runestone.treasury.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.runestone.treasury.entity.*;
import com.runestone.treasury.repository.*;
import java.math.BigDecimal;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JournalEntryServiceTests {

  @Mock private JournalEntryRepository journalEntryRepository;

  @Mock private PostingLegRepository postingLegRepository;

  @Mock private TreasuryAccountRepository treasuryAccountRepository;

  @Mock private BalanceHoldRepository balanceHoldRepository;

  @Mock private UserService userService;

  @Mock private OutboxEventService outboxEventService;

  @Mock private ComplianceAuditLogService complianceAuditLogService;

  @InjectMocks private JournalEntryService journalEntryService;

  @Test
  void testSettledTransferSuccess() {
    User user = new User();
    user.setId(10L);
    user.setUserName("ram");

    TreasuryAccount acc1 = new TreasuryAccount();
    acc1.setId(1L);
    acc1.setAvailableBalance(new BigDecimal("1000.0000"));
    acc1.setHeldBalance(BigDecimal.ZERO);
    acc1.setPostedBalance(new BigDecimal("1000.0000"));

    TreasuryAccount acc2 = new TreasuryAccount();
    acc2.setId(2L);
    acc2.setAvailableBalance(new BigDecimal("500.0000"));
    acc2.setHeldBalance(BigDecimal.ZERO);
    acc2.setPostedBalance(new BigDecimal("500.0000"));

    JournalEntry entry = new JournalEntry();
    entry.setId(101L);
    entry.setIdempotencyKey("test-key-1");
    entry.setSourceAccountId(1L);
    entry.setDestinationAccountId(2L);
    entry.setAmount(new BigDecimal("200.0000"));

    when(userService.findByUserName("ram")).thenReturn(user);
    when(treasuryAccountRepository.lockAccountsInOrder(Arrays.asList(1L, 2L)))
        .thenReturn(Arrays.asList(acc1, acc2));
    when(journalEntryRepository.save(any(JournalEntry.class))).thenReturn(entry);

    journalEntryService.saveEntry(entry, "ram", false, null);

    assertEquals(new BigDecimal("800.0000"), acc1.getAvailableBalance());
    assertEquals(new BigDecimal("700.0000"), acc2.getAvailableBalance());
    assertEquals("SETTLED", entry.getStatus());

    verify(postingLegRepository, times(2)).save(any(PostingLeg.class));
    verify(treasuryAccountRepository, times(2)).save(any(TreasuryAccount.class));
  }

  @Test
  void testPendingHoldWhenFlaggedForAml() {
    User user = new User();
    user.setId(10L);
    user.setUserName("ram");

    TreasuryAccount acc1 = new TreasuryAccount();
    acc1.setId(1L);
    acc1.setAvailableBalance(new BigDecimal("1000.0000"));
    acc1.setHeldBalance(BigDecimal.ZERO);
    acc1.setPostedBalance(new BigDecimal("1000.0000"));

    TreasuryAccount acc2 = new TreasuryAccount();
    acc2.setId(2L);
    acc2.setAvailableBalance(new BigDecimal("500.0000"));
    acc2.setHeldBalance(BigDecimal.ZERO);
    acc2.setPostedBalance(new BigDecimal("500.0000"));

    JournalEntry entry = new JournalEntry();
    entry.setId(102L);
    entry.setIdempotencyKey("test-key-hold");
    entry.setSourceAccountId(1L);
    entry.setDestinationAccountId(2L);
    entry.setAmount(new BigDecimal("300.0000"));

    when(userService.findByUserName("ram")).thenReturn(user);
    when(treasuryAccountRepository.lockAccountsInOrder(Arrays.asList(1L, 2L)))
        .thenReturn(Arrays.asList(acc1, acc2));
    when(journalEntryRepository.save(any(JournalEntry.class))).thenReturn(entry);
    when(balanceHoldRepository.save(any(BalanceHold.class)))
        .thenAnswer(
            invocation -> {
              BalanceHold h = invocation.getArgument(0);
              h.setId(501L);
              return h;
            });

    journalEntryService.saveEntry(entry, "ram", true, "VELOCITY_SPIKE");

    // Funds moved from available to held on source account
    assertEquals(new BigDecimal("700.0000"), acc1.getAvailableBalance());
    assertEquals(new BigDecimal("300.0000"), acc1.getHeldBalance());
    assertEquals("PENDING_HOLD", entry.getStatus());

    verify(balanceHoldRepository, times(1)).save(any(BalanceHold.class));
    verify(postingLegRepository, never()).save(any(PostingLeg.class));
  }

  @Test
  void testInsufficientBalanceThrowsException() {
    User user = new User();
    user.setId(10L);
    user.setUserName("ram");

    TreasuryAccount acc1 = new TreasuryAccount();
    acc1.setId(1L);
    acc1.setAvailableBalance(new BigDecimal("50.0000"));
    acc1.setHeldBalance(BigDecimal.ZERO);
    acc1.setPostedBalance(new BigDecimal("50.0000"));

    TreasuryAccount acc2 = new TreasuryAccount();
    acc2.setId(2L);
    acc2.setAvailableBalance(BigDecimal.ZERO);
    acc2.setHeldBalance(BigDecimal.ZERO);
    acc2.setPostedBalance(BigDecimal.ZERO);

    JournalEntry entry = new JournalEntry();
    entry.setSourceAccountId(1L);
    entry.setDestinationAccountId(2L);
    entry.setAmount(new BigDecimal("200.0000"));

    when(userService.findByUserName("ram")).thenReturn(user);
    when(treasuryAccountRepository.lockAccountsInOrder(Arrays.asList(1L, 2L)))
        .thenReturn(Arrays.asList(acc1, acc2));

    assertThrows(
        IllegalStateException.class,
        () -> journalEntryService.saveEntry(entry, "ram", false, null));
  }
}
