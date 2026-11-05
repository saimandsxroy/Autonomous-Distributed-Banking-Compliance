package com.runestone.treasury.controller;

import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.entity.User;
import com.runestone.treasury.service.TreasuryAccountService;
import com.runestone.treasury.service.UserService;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/account")
public class TreasuryAccountController {

  @Autowired private TreasuryAccountService treasuryAccountService;

  @Autowired private UserService userService;

  @GetMapping
  public ResponseEntity<?> getAllAccountsOfUser() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    String userName = authentication.getName();
    User user = userService.findByUserName(userName);
    if (user != null) {
      List<TreasuryAccount> all = treasuryAccountService.findByUserId(user.getId());
      if (all == null || all.isEmpty()) {
        TreasuryAccount initialAcc = new TreasuryAccount();
        initialAcc.setCurrency("USD");
        initialAcc.setStatus("ACTIVE");
        initialAcc.setAvailableBalance(new java.math.BigDecimal("10000.00"));
        initialAcc.setHeldBalance(java.math.BigDecimal.ZERO);
        initialAcc.setPostedBalance(new java.math.BigDecimal("10000.00"));
        TreasuryAccount created = treasuryAccountService.createAccount(initialAcc, userName);
        return new ResponseEntity<>(List.of(created), HttpStatus.OK);
      }
      return new ResponseEntity<>(all, HttpStatus.OK);
    }
    return new ResponseEntity<>(List.of(), HttpStatus.OK);
  }

  @GetMapping("/all")
  public ResponseEntity<List<TreasuryAccount>> getAllAccounts() {
    List<TreasuryAccount> all = treasuryAccountService.getAll();
    return new ResponseEntity<>(all, HttpStatus.OK);
  }

  @PostMapping
  public ResponseEntity<?> createAccount(@RequestBody TreasuryAccount account) {
    try {
      Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
      String userName = authentication.getName();
      TreasuryAccount created = treasuryAccountService.createAccount(account, userName);
      return new ResponseEntity<>(created, HttpStatus.CREATED);
    } catch (Exception e) {
      return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
    }
  }

  @GetMapping("/id/{myId}")
  public ResponseEntity<?> getAccountById(@PathVariable Long myId) {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    String userName = authentication.getName();
    User user = userService.findByUserName(userName);
    if (user != null) {
      List<TreasuryAccount> matched =
          user.getTreasuryAccounts().stream()
              .filter(a -> a.getId().equals(myId))
              .collect(Collectors.toList());
      if (!matched.isEmpty()) {
        Optional<TreasuryAccount> account = treasuryAccountService.findById(myId);
        if (account.isPresent()) {
          return new ResponseEntity<>(account.get(), HttpStatus.OK);
        }
      }
    }
    return new ResponseEntity<>(HttpStatus.NOT_FOUND);
  }
}
