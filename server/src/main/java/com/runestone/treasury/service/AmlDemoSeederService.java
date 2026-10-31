package com.runestone.treasury.service;

import com.runestone.treasury.entity.AmlInvestigation;
import com.runestone.treasury.entity.BalanceHold;
import com.runestone.treasury.entity.HitlApprovalRequest;
import com.runestone.treasury.entity.JournalEntry;
import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.entity.User;
import com.runestone.treasury.repository.BalanceHoldRepository;
import com.runestone.treasury.repository.HitlApprovalRequestRepository;
import com.runestone.treasury.repository.TreasuryAccountRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AmlDemoSeederService {

  private static final Logger log = LoggerFactory.getLogger(AmlDemoSeederService.class);

  @Autowired private UserService userService;

  @Autowired private TreasuryAccountService treasuryAccountService;

  @Autowired private TreasuryAccountRepository treasuryAccountRepository;

  @Autowired private JournalEntryService journalEntryService;

  @Autowired private BalanceHoldRepository balanceHoldRepository;

  @Autowired private AmlGraphDetectionService amlGraphDetectionService;

  @Autowired private GeminiAmlDetectiveService geminiAmlDetectiveService;

  @Autowired private HitlApprovalRequestRepository hitlApprovalRequestRepository;

  /**
   * Seeds an end-to-end 3-hop circular AML layering scenario (Alice -> Bob -> Charlie -> Alice)
   * that automatically triggers circular ring detection, places the final leg in PENDING_HOLD,
   * invokes the autonomous Gemini Detective, and queues an HITL approval request.
   */
  @Transactional
  public Map<String, Object> seedAmlScenario() {
    log.info("Starting live AML demo scenario seeder");

    // 1. Ensure demo users exist
    User alice = ensureUser("alice", "alice@runestone.com", List.of("USER"));
    User bob = ensureUser("bob", "bob@runestone.com", List.of("USER"));
    User charlie = ensureUser("charlie", "charlie@runestone.com", List.of("USER"));
    User sarah =
        ensureUser(
            "sarah_compliance", "sarah@runestone.com", List.of("ADMIN", "COMPLIANCE_OFFICER"));

    // 2. Ensure each user has an ACTIVE, well-funded treasury account
    TreasuryAccount aliceAcc = ensureFundedActiveAccount(alice, BigDecimal.valueOf(3000));
    TreasuryAccount bobAcc = ensureFundedActiveAccount(bob, BigDecimal.valueOf(2000));
    TreasuryAccount charlieAcc = ensureFundedActiveAccount(charlie, BigDecimal.valueOf(2000));
    ensureFundedActiveAccount(sarah, BigDecimal.valueOf(1000));

    long ts = System.currentTimeMillis();

    // 3. Hop 1: Alice -> Bob ($120.00)
    String leg1Key = "demo-aml-leg1-" + ts;
    JournalEntry entry1 = new JournalEntry();
    entry1.setIdempotencyKey(leg1Key);
    entry1.setSourceAccountId(aliceAcc.getId());
    entry1.setDestinationAccountId(bobAcc.getId());
    entry1.setAmount(BigDecimal.valueOf(120.00));
    entry1.setCurrency("USD");
    entry1.setReferenceType("TRANSFER");
    entry1.setTitle("Demo Hop 1: Alice to Bob");
    journalEntryService.saveEntry(entry1, alice.getUserName(), false, null);

    // 4. Hop 2: Bob -> Charlie ($110.00)
    String leg2Key = "demo-aml-leg2-" + ts;
    JournalEntry entry2 = new JournalEntry();
    entry2.setIdempotencyKey(leg2Key);
    entry2.setSourceAccountId(bobAcc.getId());
    entry2.setDestinationAccountId(charlieAcc.getId());
    entry2.setAmount(BigDecimal.valueOf(110.00));
    entry2.setCurrency("USD");
    entry2.setReferenceType("TRANSFER");
    entry2.setTitle("Demo Hop 2: Bob to Charlie");
    journalEntryService.saveEntry(entry2, bob.getUserName(), false, null);

    // 5. Hop 3: Charlie -> Alice ($100.00) - Closes the loop!
    String leg3Key = "demo-aml-leg3-" + ts;
    JournalEntry entry3 = new JournalEntry();
    entry3.setIdempotencyKey(leg3Key);
    entry3.setSourceAccountId(charlieAcc.getId());
    entry3.setDestinationAccountId(aliceAcc.getId());
    entry3.setAmount(BigDecimal.valueOf(100.00));
    entry3.setCurrency("USD");
    entry3.setReferenceType("TRANSFER");
    entry3.setTitle("Demo Hop 3: Charlie to Alice (Circular)");

    // Evaluate graph risk directly
    String graphRisk =
        amlGraphDetectionService.evaluateTransferGraphRisk(
            charlieAcc.getId(), aliceAcc.getId(), BigDecimal.valueOf(100.00));
    if (graphRisk == null) {
      graphRisk =
          "CIRCULAR_RING_DETECTED: path=" + aliceAcc.getId() + "->...-> " + charlieAcc.getId();
    }

    journalEntryService.saveEntry(entry3, charlie.getUserName(), true, graphRisk);

    // 6. Retrieve created BalanceHold
    BalanceHold hold =
        balanceHoldRepository
            .findByIdempotencyKey(leg3Key)
            .orElseThrow(
                () -> new IllegalStateException("BalanceHold not found for seeded scenario"));

    // 7. Invoke Gemini AML Detective to generate dossier & HITL request
    AmlInvestigation investigation = geminiAmlDetectiveService.investigateBalanceHold(hold.getId());

    Optional<HitlApprovalRequest> hitlOpt =
        hitlApprovalRequestRepository.findByBalanceHoldId(hold.getId());

    Map<String, Object> summary = new HashMap<>();
    summary.put("status", "SUCCESS");
    summary.put("message", "Live 3-hop AML circular layering scenario seeded successfully");
    summary.put("balanceHoldId", hold.getId());
    summary.put("riskReason", hold.getRiskReason());
    summary.put("investigationId", investigation.getId());
    summary.put("riskScore", investigation.getRiskScore());
    summary.put("riskSeverity", investigation.getRiskSeverity());
    summary.put("recommendedTool", investigation.getRecommendedTool());
    summary.put("approvalRequestId", hitlOpt.map(HitlApprovalRequest::getId).orElse(null));

    Map<String, Object> accounts = new HashMap<>();
    accounts.put("aliceAccountId", aliceAcc.getId());
    accounts.put("bobAccountId", bobAcc.getId());
    accounts.put("charlieAccountId", charlieAcc.getId());
    summary.put("accounts", accounts);

    log.info(
        "Live AML demo scenario seeded successfully: holdId={}, invId={}",
        hold.getId(),
        investigation.getId());
    return summary;
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
      log.info("Demo user {} created with email {}", userName, email);
    } else {
      user.setEmail(email);
      user.setRoles(new ArrayList<>(roles));
      userService.saveUser(user);
    }
    return user;
  }

  private TreasuryAccount ensureFundedActiveAccount(User user, BigDecimal targetBalance) {
    List<TreasuryAccount> accounts = treasuryAccountService.findByUserId(user.getId());
    TreasuryAccount acc;
    if (accounts == null || accounts.isEmpty()) {
      acc = new TreasuryAccount();
      acc.setAccountNumber(
          "AC-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase());
      acc.setCurrency("USD");
      acc.setStatus("ACTIVE");
      acc.setAvailableBalance(targetBalance);
      acc.setHeldBalance(BigDecimal.ZERO);
      acc.setPostedBalance(targetBalance);
      acc = treasuryAccountService.createAccount(acc, user.getUserName());
      log.info("Created account {} for user {}", acc.getAccountNumber(), user.getUserName());
    } else {
      acc = accounts.get(0);
      acc.setStatus("ACTIVE");
      if (acc.getAvailableBalance().compareTo(BigDecimal.valueOf(500)) < 0) {
        acc.setAvailableBalance(targetBalance);
        acc.setHeldBalance(BigDecimal.ZERO);
        acc.setPostedBalance(targetBalance);
      }
      acc.setUpdatedAt(LocalDateTime.now());
      treasuryAccountRepository.save(acc);
      log.info("Account {} reactivated and funded for user {}", acc.getId(), user.getUserName());
    }
    return acc;
  }
}
