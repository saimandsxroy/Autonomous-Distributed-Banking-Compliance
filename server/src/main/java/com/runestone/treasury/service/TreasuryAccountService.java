package com.runestone.treasury.service;

import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.entity.User;
import com.runestone.treasury.repository.TreasuryAccountRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TreasuryAccountService {

  private static final Logger log = LoggerFactory.getLogger(TreasuryAccountService.class);

  @Autowired private TreasuryAccountRepository treasuryAccountRepository;

  @Autowired private UserService userService;

  public List<TreasuryAccount> getAll() {
    return treasuryAccountRepository.findAll();
  }

  public Optional<TreasuryAccount> findById(Long id) {
    return treasuryAccountRepository.findById(id);
  }

  public Optional<TreasuryAccount> findByAccountNumber(String accountNumber) {
    return treasuryAccountRepository.findByAccountNumber(accountNumber);
  }

  public List<TreasuryAccount> findByUserId(Long userId) {
    return treasuryAccountRepository.findByUserId(userId);
  }

  @Transactional
  public TreasuryAccount createAccount(TreasuryAccount account, String userName) {
    User user = userService.findByUserName(userName);
    if (user == null) {
      throw new IllegalArgumentException("User not found: " + userName);
    }
    if (account.getAccountNumber() == null || account.getAccountNumber().trim().isEmpty()) {
      account.setAccountNumber(
          "AC-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase());
    }
    account.setUserId(user.getId());
    if (account.getAvailableBalance() == null) {
      account.setAvailableBalance(BigDecimal.ZERO);
    }
    if (account.getHeldBalance() == null) {
      account.setHeldBalance(BigDecimal.ZERO);
    }
    if (account.getPostedBalance() == null) {
      account.setPostedBalance(account.getAvailableBalance().add(account.getHeldBalance()));
    }
    account.setCreatedAt(LocalDateTime.now());
    account.setUpdatedAt(LocalDateTime.now());
    TreasuryAccount saved = treasuryAccountRepository.save(account);

    user.getTreasuryAccounts().add(saved);
    userService.saveUser(user);
    log.info("Created treasury account {} for user {}", saved.getAccountNumber(), userName);
    return saved;
  }

  @Transactional
  public void freezeAccount(Long accountId) {
    Optional<TreasuryAccount> opt = treasuryAccountRepository.findById(accountId);
    if (opt.isPresent()) {
      TreasuryAccount account = opt.get();
      account.setStatus("FROZEN_AML");
      account.setUpdatedAt(LocalDateTime.now());
      treasuryAccountRepository.save(account);
      log.warn("Treasury account {} frozen under AML protocol", accountId);
    }
  }

  public void save(TreasuryAccount account) {
    treasuryAccountRepository.save(account);
  }
}
