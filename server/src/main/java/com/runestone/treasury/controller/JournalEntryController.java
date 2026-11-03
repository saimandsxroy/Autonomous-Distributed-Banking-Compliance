package com.runestone.treasury.controller;

import com.runestone.treasury.dto.request.TransferRequestDto;
import com.runestone.treasury.entity.JournalEntry;
import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.entity.User;
import com.runestone.treasury.service.AmlGraphDetectionService;
import com.runestone.treasury.service.IdempotencyService;
import com.runestone.treasury.service.JournalEntryService;
import com.runestone.treasury.service.UserService;
import com.runestone.treasury.service.VelocityRiskService;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/journal")
public class JournalEntryController {

  private static final Logger log = LoggerFactory.getLogger(JournalEntryController.class);

  @Autowired private JournalEntryService journalEntryService;

  @Autowired private UserService userService;

  @Autowired private IdempotencyService idempotencyService;

  @Autowired private VelocityRiskService velocityRiskService;

  @Autowired private AmlGraphDetectionService amlGraphDetectionService;

  @GetMapping
  public ResponseEntity<?> getAllJournalEntriesOfUser() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    String userName = authentication.getName();
    User user = userService.findByUserName(userName);
    if (user != null) {
      List<JournalEntry> all = user.getJournalEntries();
      if (all != null) {
        return new ResponseEntity<>(all, HttpStatus.OK);
      }
    }
    return new ResponseEntity<>(java.util.Collections.emptyList(), HttpStatus.OK);
  }

  @PostMapping
  public ResponseEntity<?> createEntry(
      @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKeyHeader,
      @Valid @RequestBody TransferRequestDto dto) {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    String userName = authentication.getName();

    // Prefer DTO idempotencyKey; fall back to header for backward compatibility
    String idempotencyKey =
        (dto.getIdempotencyKey() != null && !dto.getIdempotencyKey().trim().isEmpty())
            ? dto.getIdempotencyKey()
            : idempotencyKeyHeader;

    // Map DTO to JournalEntry entity
    JournalEntry myEntry = new JournalEntry();
    myEntry.setSourceAccountId(dto.getSourceAccountId());
    myEntry.setDestinationAccountId(dto.getDestinationAccountId());
    myEntry.setAmount(dto.getAmount());
    myEntry.setCurrency(
        dto.getCurrency() != null && !dto.getCurrency().isBlank() ? dto.getCurrency() : "USD");
    if (dto.getTargetCurrency() != null && !dto.getTargetCurrency().isBlank()) {
      myEntry.setTargetCurrency(dto.getTargetCurrency().trim().toUpperCase());
    }
    myEntry.setReferenceType(
        dto.getReferenceType() != null && !dto.getReferenceType().isBlank()
            ? dto.getReferenceType()
            : "TRANSFER");
    if (dto.getTitle() != null && !dto.getTitle().isBlank()) {
      myEntry.setTitle(dto.getTitle());
    } else {
      myEntry.setTitle("Treasury Transfer #" + (idempotencyKey != null ? idempotencyKey : ""));
    }
    if (dto.getNotes() != null && !dto.getNotes().isBlank()) {
      myEntry.setContent(dto.getNotes());
    } else if (dto.getContent() != null && !dto.getContent().isBlank()) {
      myEntry.setContent(dto.getContent());
    }

    try {
      if (idempotencyKey == null || idempotencyKey.trim().isEmpty()) {
        return new ResponseEntity<>("Missing Idempotency-Key header", HttpStatus.BAD_REQUEST);
      }
      if (myEntry.getAmount() == null || myEntry.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
        return new ResponseEntity<>("Transfer amount must be positive", HttpStatus.BAD_REQUEST);
      }

      User user = userService.findByUserName(userName);
      if (user == null) {
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
      }

      // Controller-level ownership check (journalApp style)
      List<TreasuryAccount> ownedSource =
          user.getTreasuryAccounts().stream()
              .filter(x -> x.getId().equals(myEntry.getSourceAccountId()))
              .collect(Collectors.toList());
      if (ownedSource.isEmpty()) {
        return new ResponseEntity<>("Source account not owned by user", HttpStatus.NOT_FOUND);
      }

      // Set idempotency key on the entry FIRST so all hash computations are consistent
      myEntry.setIdempotencyKey(idempotencyKey);

      // Multi-layer idempotency check
      String idempotencyResult = idempotencyService.checkAndLock(userName, idempotencyKey, myEntry);
      if ("IN_FLIGHT".equals(idempotencyResult)) {
        return new ResponseEntity<>(
            "Request already in-flight. Retry after 5 seconds.", HttpStatus.CONFLICT);
      }
      if ("HASH_MISMATCH".equals(idempotencyResult)) {
        return new ResponseEntity<>(
            "Idempotency key reused with different payload.", HttpStatus.UNPROCESSABLE_ENTITY);
      }
      if (idempotencyResult != null && idempotencyResult.startsWith("REPLAY:")) {
        return ResponseEntity.status(HttpStatus.OK)
            .header(
                org.springframework.http.HttpHeaders.CONTENT_TYPE,
                org.springframework.http.MediaType.APPLICATION_JSON_VALUE)
            .body(idempotencyResult.substring(7));
      }

      // Mark idempotency as STARTED in MySQL
      idempotencyService.markStarted(userName, idempotencyKey, myEntry);

      // Redis Lua velocity risk evaluation
      String velocityRisk = velocityRiskService.evaluateTransferRisk(myEntry);

      // AML graph fraud detection (circular ring, fan-out, fan-in)
      String graphRisk =
          amlGraphDetectionService.evaluateTransferGraphRisk(
              myEntry.getSourceAccountId(), myEntry.getDestinationAccountId(), myEntry.getAmount());

      String riskReason;
      if (velocityRisk != null && graphRisk != null) {
        riskReason = velocityRisk + "; " + graphRisk;
      } else if (velocityRisk != null) {
        riskReason = velocityRisk;
      } else {
        riskReason = graphRisk;
      }
      boolean holdForAml = (riskReason != null);

      journalEntryService.saveEntry(myEntry, userName, holdForAml, riskReason);

      // Mark as COMPLETED with response body
      idempotencyService.markCompleted(userName, idempotencyKey, 201, myEntry);

      return new ResponseEntity<>(myEntry, HttpStatus.CREATED);
    } catch (Exception e) {
      log.error("Journal entry creation failed for user {}: {}", userName, e.getMessage());
      idempotencyService.releaseLock(userName, idempotencyKey);
      return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
    }
  }

  @GetMapping("/id/{myId}")
  public ResponseEntity<?> getJournalEntryById(@PathVariable Long myId) {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    String userName = authentication.getName();
    User user = userService.findByUserName(userName);
    if (user != null) {
      List<JournalEntry> collect =
          user.getJournalEntries().stream()
              .filter(x -> x.getId().equals(myId))
              .collect(Collectors.toList());
      if (!collect.isEmpty()) {
        Optional<JournalEntry> journalEntry = journalEntryService.findById(myId);
        if (journalEntry.isPresent()) {
          return new ResponseEntity<>(journalEntry.get(), HttpStatus.OK);
        }
      }
    }
    return new ResponseEntity<>(HttpStatus.NOT_FOUND);
  }
}
