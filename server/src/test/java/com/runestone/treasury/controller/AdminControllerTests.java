package com.runestone.treasury.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.http.HttpStatus.*;

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
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class AdminControllerTests {

  @Mock private UserService userService;

  @Mock private UserRepository userRepository;

  @Mock private AppCache appCache;

  @Mock private DeadLetterEventRepository deadLetterEventRepository;

  @Mock private OutboxEventRepository outboxEventRepository;

  @Mock private KafkaTemplate<String, String> kafkaTemplate;

  @Mock private ComplianceAuditLogService complianceAuditLogService;

  @InjectMocks private AdminController adminController;

  @BeforeEach
  void setUp() {
    // Set admin as authenticated user in security context
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken("admin", "admin123", Collections.emptyList()));
  }

  // ── GET /admin/all-users ──────────────────────────────────────────────────

  @Test
  void getAllUsers_returnsOkWithUserList() {
    User alice = new User();
    alice.setUserName("alice");
    when(userService.getAll()).thenReturn(List.of(alice));

    ResponseEntity<?> response = adminController.getAllUsers();

    assertThat(response.getStatusCode()).isEqualTo(OK);
    assertThat(response.getBody()).isInstanceOf(List.class);
  }

  @Test
  void getAllUsers_returnsNotFoundWhenEmpty() {
    when(userService.getAll()).thenReturn(Collections.emptyList());

    ResponseEntity<?> response = adminController.getAllUsers();

    assertThat(response.getStatusCode()).isEqualTo(NOT_FOUND);
  }

  // ── POST /admin/create-admin-user ─────────────────────────────────────────

  @Test
  void createAdminUser_returnsCreatedOnSuccess() {
    User req = new User();
    req.setUserName("newadmin");
    req.setPassword("pass123");
    when(userService.saveNewUser(any(User.class))).thenReturn(true);

    ResponseEntity<?> response = adminController.createAdminUser(req);

    assertThat(response.getStatusCode()).isEqualTo(CREATED);
    assertThat(req.getRoles()).contains("ADMIN", "COMPLIANCE_OFFICER");
  }

  @Test
  void createAdminUser_returnsConflictWhenUserExists() {
    User req = new User();
    req.setUserName("existingadmin");
    req.setPassword("pass123");
    when(userService.saveNewUser(any(User.class))).thenReturn(false);

    ResponseEntity<?> response = adminController.createAdminUser(req);

    assertThat(response.getStatusCode()).isEqualTo(CONFLICT);
  }

  // ── POST /admin/clear-app-cache ───────────────────────────────────────────

  @Test
  void clearAppCache_returnsOkOnSuccess() {
    doNothing().when(appCache).init();

    ResponseEntity<?> response = adminController.clearAppCache();

    assertThat(response.getStatusCode()).isEqualTo(OK);
    verify(appCache).init();
  }

  @Test
  void clearAppCache_returns500OnFailure() {
    doThrow(new RuntimeException("DB down")).when(appCache).init();

    ResponseEntity<?> response = adminController.clearAppCache();

    assertThat(response.getStatusCode()).isEqualTo(INTERNAL_SERVER_ERROR);
  }

  // ── GET /admin/dlq ────────────────────────────────────────────────────────

  @Test
  void getDeadLetterQueue_returnsOkWithEvents() {
    DeadLetterEvent dlq = new DeadLetterEvent();
    dlq.setId(1L);
    dlq.setEventType("transaction.completed");
    dlq.setOriginalTopic("treasury.transfers.settled");
    dlq.setPayload("{}");
    dlq.setFailureReason("Kafka down");
    dlq.setCreatedAt(LocalDateTime.now());
    when(deadLetterEventRepository.findAll()).thenReturn(List.of(dlq));

    ResponseEntity<?> response = adminController.getDeadLetterQueue();

    assertThat(response.getStatusCode()).isEqualTo(OK);
  }

  @Test
  void getDeadLetterQueue_returnsNotFoundWhenEmpty() {
    when(deadLetterEventRepository.findAll()).thenReturn(Collections.emptyList());

    ResponseEntity<?> response = adminController.getDeadLetterQueue();

    assertThat(response.getStatusCode()).isEqualTo(NOT_FOUND);
  }

  // ── POST /admin/dlq/id/{id}/replay ───────────────────────────────────────

  @Test
  void replayDlqEvent_returnsOkAndRequeuesToOutbox() throws Exception {
    DeadLetterEvent dlq = new DeadLetterEvent();
    dlq.setId(5L);
    dlq.setOutboxEventId(99L);
    dlq.setOriginalTopic("treasury.transfers.settled");
    dlq.setEventType("transaction.completed");
    dlq.setPayload("{\"amount\":\"500\"}");
    dlq.setFailureReason("Kafka timeout");
    dlq.setReplayed(false);
    dlq.setCreatedAt(LocalDateTime.now().minusMinutes(10));

    when(deadLetterEventRepository.findById(5L)).thenReturn(Optional.of(dlq));
    when(outboxEventRepository.save(any(OutboxEvent.class))).thenAnswer(inv -> inv.getArgument(0));
    when(deadLetterEventRepository.save(any(DeadLetterEvent.class)))
        .thenAnswer(inv -> inv.getArgument(0));

    ResponseEntity<?> response = adminController.replayDlqEvent(5L);

    assertThat(response.getStatusCode()).isEqualTo(OK);
    verify(outboxEventRepository).save(argThat(e -> "PENDING".equals(e.getStatus())));
    verify(deadLetterEventRepository)
        .save(argThat(d -> d.isReplayed() && d.getReplayedAt() != null));
    verify(complianceAuditLogService)
        .recordAuditEvent(eq("admin"), eq("DLQ_REPLAY"), eq(5L), any());
  }

  @Test
  void replayDlqEvent_returnsNotFoundForUnknownId() {
    when(deadLetterEventRepository.findById(999L)).thenReturn(Optional.empty());

    ResponseEntity<?> response = adminController.replayDlqEvent(999L);

    assertThat(response.getStatusCode()).isEqualTo(NOT_FOUND);
  }

  @Test
  void replayDlqEvent_returnsConflictIfAlreadyReplayed() {
    DeadLetterEvent dlq = new DeadLetterEvent();
    dlq.setId(7L);
    dlq.setOriginalTopic("treasury.transfers.settled");
    dlq.setEventType("transaction.completed");
    dlq.setPayload("{}");
    dlq.setFailureReason("err");
    dlq.setReplayed(true);
    dlq.setReplayedAt(LocalDateTime.now().minusMinutes(5));
    dlq.setCreatedAt(LocalDateTime.now().minusMinutes(30));

    when(deadLetterEventRepository.findById(7L)).thenReturn(Optional.of(dlq));

    ResponseEntity<?> response = adminController.replayDlqEvent(7L);

    assertThat(response.getStatusCode()).isEqualTo(CONFLICT);
    verify(outboxEventRepository, never()).save(any());
  }
}
