package com.runestone.treasury.config;

import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.entity.User;
import com.runestone.treasury.repository.TreasuryAccountRepository;
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

  @Override
  public void run(String... args) {
    try {
      log.info("Starting idempotent database bootstrap & demo data verification...");
      User alice = ensureUser("alice", "alice@runestone.com", List.of("USER"));
      User bob = ensureUser("bob", "bob@runestone.com", List.of("USER"));
      User charlie = ensureUser("charlie", "charlie@runestone.com", List.of("USER"));
      User sarah = ensureUser("sarah_compliance", "sarah@runestone.com", List.of("ADMIN", "COMPLIANCE_OFFICER"));

      ensureFundedAccount(alice, new BigDecimal("25000.00"), "USD");
      ensureFundedAccount(bob, new BigDecimal("15000.00"), "USD");
      ensureFundedAccount(charlie, new BigDecimal("10000.00"), "USD");
      ensureFundedAccount(sarah, new BigDecimal("50000.00"), "USD");
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
    }
    return user;
  }

  private TreasuryAccount ensureFundedAccount(User user, BigDecimal minBalance, String currency) {
    List<TreasuryAccount> accounts = treasuryAccountService.findByUserId(user.getId());
    if (accounts == null || accounts.isEmpty()) {
      TreasuryAccount acc = new TreasuryAccount();
      acc.setAccountNumber("AC-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase());
      acc.setCurrency(currency);
      acc.setStatus("ACTIVE");
      acc.setAvailableBalance(minBalance);
      acc.setHeldBalance(BigDecimal.ZERO);
      acc.setPostedBalance(minBalance);
      return treasuryAccountService.createAccount(acc, user.getUserName());
    }
    return accounts.get(0);
  }
}
