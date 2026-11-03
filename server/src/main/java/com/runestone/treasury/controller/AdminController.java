package com.runestone.treasury.controller;

import com.runestone.treasury.cache.AppCache;
import com.runestone.treasury.entity.DeadLetterEvent;
import com.runestone.treasury.entity.OutboxEvent;
import com.runestone.treasury.entity.User;
import com.runestone.treasury.repository.DeadLetterEventRepository;
import com.runestone.treasury.repository.OutboxEventRepository;
import com.runestone.treasury.repository.UserRepository;
import com.runestone.treasury.service.ComplianceAuditLogService;
import com.runestone.treasury.service.UserService;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin")
public class AdminController {

  private static final Logger log = LoggerFactory.getLogger(AdminController.class);

  @Autowired private UserService userService;

  @Autowired private UserRepository userRepository;

  @Autowired private AppCache appCache;

  @Autowired private DeadLetterEventRepository deadLetterEventRepository;

  @Autowired private OutboxEventRepository outboxEventRepository;

  @Autowired private KafkaTemplate<String, String> kafkaTemplate;

  @Autowired private ComplianceAuditLogService complianceAuditLogService;

  /** GET /admin/all-users — returns all registered users or 404 if none. */
  @GetMapping("/all-users")
  public ResponseEntity<?> getAllUsers() {
    List<User> users = userService.getAll();
    if (users == null || users.isEmpty()) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).body("No users found in the system");
    }
    return ResponseEntity.ok(users);
  }

  /**
   * POST /admin/create-admin-user — creates a new user with ADMIN and COMPLIANCE_OFFICER roles.
   *
   * <p>Request body: { "userName": "...", "password": "...", "email": "..." }
   */
  @PostMapping("/create-admin-user")
  public ResponseEntity<?> createAdminUser(@RequestBody User userRequest) {
    try {
      userRequest.setRoles(Arrays.asList("ADMIN", "COMPLIANCE_OFFICER"));
      boolean created = userService.saveNewUser(userRequest);
      if (!created) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body("User already exists or could not be created: " + userRequest.getUserName());
      }
      log.info("Admin user created: {}", userRequest.getUserName());
      return ResponseEntity.status(HttpStatus.CREATED)
          .body("Admin user created: " + userRequest.getUserName());
    } catch (Exception e) {
      log.error("Error creating admin user: {}", e.getMessage());
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
          .body("Failed to create admin user: " + e.getMessage());
    }
  }

  /**
   * POST /admin/clear-app-cache — reloads AppCache from config_treasury_app table. Returns 200 OK
   * on success.
   */
  @PostMapping("/clear-app-cache")
  public ResponseEntity<?> clearAppCache() {
    try {
      appCache.init();
      log.info("AppCache reloaded by admin");
      return ResponseEntity.ok("AppCache reloaded successfully");
    } catch (Exception e) {
      log.error("Failed to reload AppCache: {}", e.getMessage());
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
          .body("Failed to reload AppCache: " + e.getMessage());
    }
  }

  /** GET /admin/dlq — returns all dead letter events, or 404 if empty. */
  @GetMapping("/dlq")
  public ResponseEntity<?> getDeadLetterQueue() {
    List<DeadLetterEvent> dlqEvents = deadLetterEventRepository.findAll();
    if (dlqEvents == null || dlqEvents.isEmpty()) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Dead letter queue is empty");
    }
    return ResponseEntity.ok(dlqEvents);
  }

  /**
   * POST /admin/dlq/id/{dlqId}/replay or /admin/dlq/replay/{dlqId} — replays a quarantined dead
   * letter event by re-queuing it as a new PENDING outbox event (or re-publishing directly to Kafka
   * if broker is available). Marks the DLQ record as REPLAYED. Records a ComplianceAuditLog entry.
   * Returns 200 OK.
   */
  @PostMapping({"/dlq/id/{dlqId}/replay", "/dlq/replay/{dlqId}"})
  public ResponseEntity<?> replayDlqEvent(@PathVariable Long dlqId) {
    String actor =
        SecurityContextHolder.getContext().getAuthentication() != null
            ? SecurityContextHolder.getContext().getAuthentication().getName()
            : "system";

    Optional<DeadLetterEvent> opt = deadLetterEventRepository.findById(dlqId);
    if (opt.isEmpty()) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND)
          .body("Dead letter event not found: id=" + dlqId);
    }

    DeadLetterEvent dlqEvent = opt.get();

    if (dlqEvent.isReplayed()) {
      return ResponseEntity.status(HttpStatus.CONFLICT)
          .body("Dead letter event already replayed: id=" + dlqId);
    }

    try {
      // Re-queue as a new PENDING outbox event so the scheduler picks it up
      OutboxEvent replay = new OutboxEvent();
      replay.setAggregateType("DLQ_REPLAY");
      replay.setAggregateId(
          dlqEvent.getOutboxEventId() != null ? dlqEvent.getOutboxEventId() : dlqId);
      replay.setEventType(dlqEvent.getEventType());
      replay.setTopic(dlqEvent.getOriginalTopic());
      replay.setPayload(dlqEvent.getPayload());
      replay.setStatus("PENDING");
      replay.setRetryCount(0);
      replay.setNextAttemptAt(LocalDateTime.now());
      replay.setCreatedAt(LocalDateTime.now());
      outboxEventRepository.save(replay);

      // Mark DLQ record as replayed
      dlqEvent.setReplayed(true);
      dlqEvent.setReplayedAt(LocalDateTime.now());
      deadLetterEventRepository.save(dlqEvent);

      // Record compliance audit log
      complianceAuditLogService.recordAuditEvent(
          actor,
          "DLQ_REPLAY",
          dlqId,
          java.util.Map.of(
              "dlqId", dlqId,
              "originalTopic", dlqEvent.getOriginalTopic(),
              "eventType", dlqEvent.getEventType()));

      log.info("DLQ event replayed: dlqId={}, actor={}", dlqId, actor);
      return ResponseEntity.ok("Dead letter event " + dlqId + " re-queued for replay by " + actor);

    } catch (Exception e) {
      log.error("Failed to replay DLQ event id={}: {}", dlqId, e.getMessage());
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
          .body("Failed to replay DLQ event: " + e.getMessage());
    }
  }
}
