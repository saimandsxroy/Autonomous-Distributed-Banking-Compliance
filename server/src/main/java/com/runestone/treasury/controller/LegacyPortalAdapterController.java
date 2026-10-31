package com.runestone.treasury.controller;

import com.runestone.treasury.entity.JournalEntry;
import com.runestone.treasury.entity.PostingLeg;
import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.entity.User;
import com.runestone.treasury.repository.PostingLegRepository;
import com.runestone.treasury.repository.TreasuryAccountRepository;
import com.runestone.treasury.repository.UserRepository;
import com.runestone.treasury.service.JournalEntryService;
import com.runestone.treasury.service.TreasuryAccountService;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class LegacyPortalAdapterController {

  @Autowired private UserRepository userRepository;

  @Autowired private TreasuryAccountRepository treasuryAccountRepository;

  @Autowired private TreasuryAccountService treasuryAccountService;

  @Autowired private PostingLegRepository postingLegRepository;

  @Autowired private JournalEntryService journalEntryService;

  @Autowired private PasswordEncoder passwordEncoder;

  @PostMapping("/user/login")
  public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
    String emailOrUser = credentials.get("email");
    String password = credentials.get("password");

    if (emailOrUser == null || password == null) {
      return new ResponseEntity<>("Email and password required", HttpStatus.BAD_REQUEST);
    }

    Optional<User> userOpt = userRepository.findByEmail(emailOrUser);
    if (userOpt.isEmpty()) {
      userOpt = userRepository.findByUserName(emailOrUser);
    }

    if (userOpt.isEmpty()) {
      Map<String, Object> err = new HashMap<>();
      err.put("responseCode", "003");
      err.put("responseMessage", "Invalid email or username");
      return new ResponseEntity<>(err, HttpStatus.UNAUTHORIZED);
    }

    User user = userOpt.get();
    if (!passwordEncoder.matches(password, user.getPassword())) {
      Map<String, Object> err = new HashMap<>();
      err.put("responseCode", "003");
      err.put("responseMessage", "Invalid credentials");
      return new ResponseEntity<>(err, HttpStatus.UNAUTHORIZED);
    }

    // Get or initialize primary treasury account
    TreasuryAccount account;
    List<TreasuryAccount> accounts = treasuryAccountRepository.findByUserId(user.getId());
    if (accounts.isEmpty()) {
      TreasuryAccount newAcct = new TreasuryAccount();
      newAcct.setCurrency("USD");
      newAcct.setPostedBalance(new BigDecimal("1000.0000"));
      newAcct.setAvailableBalance(new BigDecimal("1000.0000"));
      account = treasuryAccountService.createAccount(newAcct, user.getUserName());
    } else {
      account = accounts.get(0);
    }

    // Generate JWT-compatible token with 24h expiration
    long expSeconds = (System.currentTimeMillis() / 1000L) + 86400L;
    String header =
        Base64.getUrlEncoder()
            .withoutPadding()
            .encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
    String payloadJson =
        "{\"sub\":\""
            + user.getUserName()
            + "\",\"email\":\""
            + user.getEmail()
            + "\",\"exp\":"
            + expSeconds
            + "}";
    String payload =
        Base64.getUrlEncoder()
            .withoutPadding()
            .encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));
    String sig =
        Base64.getUrlEncoder()
            .withoutPadding()
            .encodeToString("runestone-signature".getBytes(StandardCharsets.UTF_8));
    String jwtToken = header + "." + payload + "." + sig;

    Map<String, Object> response = new HashMap<>();
    response.put("responseCode", "002");
    response.put("responseMessage", "Login Successful");
    response.put("jwt", jwtToken);

    Map<String, Object> accountInfo = new HashMap<>();
    accountInfo.put("accountName", user.getUserName());
    accountInfo.put("accountNumber", account.getAccountNumber());
    accountInfo.put("accountBalance", account.getAvailableBalance());
    response.put("accountInfo", accountInfo);

    return new ResponseEntity<>(response, HttpStatus.OK);
  }

  @GetMapping("/user/balanceEnquiry")
  public ResponseEntity<?> getBalanceEnquiry(@RequestParam("accountNumber") String accountNumber) {
    Optional<TreasuryAccount> acctOpt =
        treasuryAccountRepository.findByAccountNumber(accountNumber);
    if (acctOpt.isEmpty()) {
      return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    TreasuryAccount acct = acctOpt.get();
    Optional<User> userOpt = userRepository.findById(acct.getUserId());

    Map<String, Object> response = new HashMap<>();
    response.put("responseCode", "004");
    response.put("responseMessage", "Success");

    Map<String, Object> accountInfo = new HashMap<>();
    accountInfo.put("accountName", userOpt.map(User::getUserName).orElse("Account Holder"));
    accountInfo.put("accountNumber", acct.getAccountNumber());
    accountInfo.put("accountBalance", acct.getAvailableBalance());
    response.put("accountInfo", accountInfo);

    return new ResponseEntity<>(response, HttpStatus.OK);
  }

  @GetMapping("/user/nameEnquiry")
  public ResponseEntity<?> getNameEnquiry(@RequestParam("accountNumber") String accountNumber) {
    return getBalanceEnquiry(accountNumber);
  }

  @GetMapping("/transactions/history")
  public ResponseEntity<?> getTransactionHistory(
      @RequestParam("accountNumber") String accountNumber) {
    Optional<TreasuryAccount> acctOpt =
        treasuryAccountRepository.findByAccountNumber(accountNumber);
    if (acctOpt.isEmpty()) {
      return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    TreasuryAccount acct = acctOpt.get();
    List<PostingLeg> legs = postingLegRepository.findByAccountId(acct.getId());
    List<Map<String, Object>> txList = new ArrayList<>();

    for (PostingLeg leg : legs) {
      Map<String, Object> tx = new HashMap<>();
      tx.put("transactionId", "TX-" + leg.getId());
      tx.put("transactionType", leg.getLegType());
      tx.put("amount", leg.getAmount().doubleValue());
      tx.put("accountNumber", acct.getAccountNumber());
      tx.put("status", "SUCCESS");
      tx.put(
          "timeOfCreation",
          leg.getCreatedAt() != null
              ? leg.getCreatedAt().toString()
              : LocalDateTime.now().toString());

      if (leg.getCounterpartyAccountId() != null) {
        Optional<TreasuryAccount> cpAcct =
            treasuryAccountRepository.findById(leg.getCounterpartyAccountId());
        if (cpAcct.isPresent()) {
          tx.put("counterpartyAccountNumber", cpAcct.get().getAccountNumber());
          Optional<User> cpUser = userRepository.findById(cpAcct.get().getUserId());
          tx.put("counterpartyName", cpUser.map(User::getUserName).orElse("Treasury"));
        } else {
          tx.put("counterpartyAccountNumber", "TREASURY");
          tx.put("counterpartyName", "Treasury Counterparty");
        }
      } else {
        tx.put("counterpartyAccountNumber", "SETTLEMENT");
        tx.put("counterpartyName", "Treasury Settlement");
      }

      txList.add(tx);
    }

    return new ResponseEntity<>(txList, HttpStatus.OK);
  }

  @PostMapping("/transactions/transfer")
  public ResponseEntity<?> transfer(@RequestBody Map<String, Object> transferReq) {
    try {
      String senderAccountNum = (String) transferReq.get("sender");
      String receiverAccountNum = (String) transferReq.get("receiver");
      BigDecimal amount = new BigDecimal(transferReq.get("amount").toString());

      Optional<TreasuryAccount> senderOpt =
          treasuryAccountRepository.findByAccountNumber(senderAccountNum);
      Optional<TreasuryAccount> receiverOpt =
          treasuryAccountRepository.findByAccountNumber(receiverAccountNum);

      if (senderOpt.isEmpty() || receiverOpt.isEmpty()) {
        Map<String, Object> err = new HashMap<>();
        err.put("responseMessage", "Sender or receiver account not found");
        return new ResponseEntity<>(err, HttpStatus.BAD_REQUEST);
      }

      TreasuryAccount sender = senderOpt.get();
      TreasuryAccount receiver = receiverOpt.get();

      User senderUser = userRepository.findById(sender.getUserId()).orElseThrow();

      JournalEntry entry = new JournalEntry();
      entry.setSourceAccountId(sender.getId());
      entry.setDestinationAccountId(receiver.getId());
      entry.setAmount(amount);
      entry.setTitle("Portal Transfer");
      entry.setContent("Portal Transfer to " + receiverAccountNum);
      entry.setIdempotencyKey("portal-tx-" + UUID.randomUUID().toString());

      journalEntryService.saveEntry(entry, senderUser.getUserName(), false, null);

      Map<String, Object> resp = new HashMap<>();
      resp.put("responseCode", "000");
      resp.put("responseMessage", "Transfer successful");
      return new ResponseEntity<>(resp, HttpStatus.OK);
    } catch (Exception e) {
      Map<String, Object> err = new HashMap<>();
      err.put("responseMessage", e.getMessage());
      return new ResponseEntity<>(err, HttpStatus.BAD_REQUEST);
    }
  }

  @GetMapping("/user/profile")
  public ResponseEntity<?> getProfile(@RequestParam("accountNumber") String accountNumber) {
    Optional<TreasuryAccount> acctOpt =
        treasuryAccountRepository.findByAccountNumber(accountNumber);
    if (acctOpt.isEmpty()) {
      return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }
    TreasuryAccount acct = acctOpt.get();
    Optional<User> userOpt = userRepository.findById(acct.getUserId());
    User user = userOpt.orElseThrow();

    Map<String, Object> profile = new HashMap<>();
    profile.put("firstName", user.getUserName());
    profile.put("lastName", "User");
    profile.put(
        "email", user.getEmail() != null ? user.getEmail() : user.getUserName() + "@runestone.com");
    profile.put("accountNumber", accountNumber);
    profile.put("emailNotifs", true);
    profile.put("loginAlerts", true);
    profile.put("transferAlerts", true);

    Map<String, Object> wrap = new HashMap<>();
    wrap.put("data", profile);
    return new ResponseEntity<>(wrap, HttpStatus.OK);
  }

  @PutMapping("/user/profile")
  public ResponseEntity<?> updateProfile(
      @RequestParam("accountNumber") String accountNumber, @RequestBody Map<String, Object> req) {
    return new ResponseEntity<>(HttpStatus.OK);
  }

  @PutMapping("/user/password")
  public ResponseEntity<?> updatePassword(
      @RequestParam("accountNumber") String accountNumber, @RequestBody Map<String, Object> req) {
    return new ResponseEntity<>(HttpStatus.OK);
  }

  @PostMapping("/bankstatement/email")
  public ResponseEntity<?> bankStatement(@RequestParam("accountNumber") String accountNumber) {
    Map<String, Object> resp = new HashMap<>();
    resp.put("message", "Bank statement queued for delivery");
    return new ResponseEntity<>(resp, HttpStatus.OK);
  }
}
