package com.runestone.treasury.config;

import com.runestone.treasury.entity.JournalEntry;
import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.entity.User;
import com.runestone.treasury.repository.JournalEntryRepository;
import com.runestone.treasury.repository.TreasuryAccountRepository;
import com.runestone.treasury.service.JournalEntryService;
import com.runestone.treasury.service.TreasuryAccountService;
import com.runestone.treasury.service.UserService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

  private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

  @Autowired private UserService userService;
  @Autowired private TreasuryAccountService treasuryAccountService;
  @Autowired private TreasuryAccountRepository treasuryAccountRepository;
  @Autowired private JournalEntryService journalEntryService;
  @Autowired private JournalEntryRepository journalEntryRepository;

  @Override
  public void run(String... args) {
    try {
      log.info("Starting idempotent database bootstrap & demo data verification...");

      // 1. Ensure core demo personas exist
      User alice = ensureUser("alice", "alice@runestone.com", List.of("USER"));
      User bob = ensureUser("bob", "bob@runestone.com", List.of("USER"));
      User charlie = ensureUser("charlie", "charlie@runestone.com", List.of("USER"));
      User sarah =
          ensureUser(
              "sarah_compliance", "sarah@runestone.com", List.of("ADMIN", "COMPLIANCE_OFFICER"));

      // 2. Ensure each persona has at least one ACTIVE funded TreasuryAccount
      TreasuryAccount aliceAcc = ensureFundedAccount(alice, new BigDecimal("25000.00"), "USD");
      TreasuryAccount bobAcc = ensureFundedAccount(bob, new BigDecimal("15000.00"), "USD");
      ensureFundedAccount(charlie, new BigDecimal("10000.00"), "USD");
      ensureFundedAccount(sarah, new BigDecimal("50000.00"), "USD");

      // 3. Ensure an initial settled journal entry exists so KPIs and charts have immediate data
      if (journalEntryRepository.count() == 0 && aliceAcc != null && bobAcc != null) {
        log.info("Seeding initial settled double-entry journal entry...");
        JournalEntry initialEntry = new JournalEntry();
        initialEntry.setIdempotencyKey(
            "init-settled-demo-" + UUID.randomUUID().toString().substring(0, 8));
        initialEntry.setSourceAccountId(aliceAcc.getId());
        initialEntry.setDestinationAccountId(bobAcc.getId());
        initialEntry.setAmount(new BigDecimal("500.00"));
        initialEntry.setCurrency("USD");
        initialEntry.setReferenceType("TRANSFER");
        initialEntry.setTitle("Initial Settlement: Reserve Provisioning");
        journalEntryService.saveEntry(initialEntry, alice.getUserName(), false, null);
        log.info("Initial settled journal entry created successfully");
      }

      log.info("Database bootstrap completed successfully.");
    } catch (Exception e) {
      log.warn("Database initialization skipped or encountered error: {}", e.getMessage());
    }
  }

  private User ensureUser(String userName, String email, List<String> roles) {
    User user = userService.findByUserName(userName);
    if (user == null) {
      user = new User();
      user.setUserName(userName);
      user.setPassword("password123");
      user.setEmail(email);
      user.setRoles(new ArrayList<>(roles));
      user.setAmlMonitoringEnabled(true);
      user.setCreatedAt(LocalDateTime.now());
      user.setTreasuryAccounts(new ArrayList<>());
      userService.saveNewUser(user);
      log.info("Initialized user {} ({})", userName, roles);
    } else {
      boolean updated = false;
      if (user.getEmail() == null || !user.getEmail().equals(email)) {
        user.setEmail(email);
        updated = true;
      }
      for (String r : roles) {
        if (!user.getRoles().contains(r)) {
          user.getRoles().add(r);
          updated = true;
        }
      }
      if (updated) {
        userService.saveUser(user);
      }
    }
    return user;
  }

  private TreasuryAccount ensureFundedAccount(User user, BigDecimal minBalance, String currency) {
    List<TreasuryAccount> accounts = treasuryAccountService.findByUserId(user.getId());
    if (accounts == null || accounts.isEmpty()) {
      TreasuryAccount acc = new TreasuryAccount();
      acc.setAccountNumber(
          "AC-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase());
      acc.setCurrency(currency);
      acc.setStatus("ACTIVE");
      acc.setAvailableBalance(minBalance);
      acc.setHeldBalance(BigDecimal.ZERO);
      acc.setPostedBalance(minBalance);
      TreasuryAccount saved = treasuryAccountService.createAccount(acc, user.getUserName());
      log.info("Provisioned account {} for user {}", saved.getAccountNumber(), user.getUserName());
      return saved;
    } else {
      TreasuryAccount acc = accounts.get(0);
      if (acc.getAvailableBalance().compareTo(new BigDecimal("500.00")) < 0) {
        acc.setAvailableBalance(minBalance);
        acc.setPostedBalance(
            minBalance.add(acc.getHeldBalance() != null ? acc.getHeldBalance() : BigDecimal.ZERO));
        acc.setUpdatedAt(LocalDateTime.now());
        treasuryAccountRepository.save(acc);
      }
      return acc;
    }
  }
}
