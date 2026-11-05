package com.runestone.treasury.config;

import com.runestone.treasury.entity.User;
import com.runestone.treasury.service.UserService;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {
  private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

  @Autowired private UserService userService;

  @Override
  public void run(String... args) {
    try {
      log.info("Starting idempotent database bootstrap & demo data verification...");
      ensureUser("alice", "alice@runestone.com", List.of("USER"));
      ensureUser("bob", "bob@runestone.com", List.of("USER"));
      ensureUser("charlie", "charlie@runestone.com", List.of("USER"));
      ensureUser("sarah_compliance", "sarah@runestone.com", List.of("ADMIN", "COMPLIANCE_OFFICER"));
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
}
