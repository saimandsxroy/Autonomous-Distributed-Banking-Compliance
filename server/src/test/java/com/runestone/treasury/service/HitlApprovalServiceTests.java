package com.runestone.treasury.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.runestone.treasury.entity.AmlInvestigation;
import com.runestone.treasury.entity.BalanceHold;
import com.runestone.treasury.entity.HitlApprovalRequest;
import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.entity.User;
import com.runestone.treasury.repository.AmlInvestigationRepository;
import com.runestone.treasury.repository.BalanceHoldRepository;
import com.runestone.treasury.repository.HitlApprovalRequestRepository;
import com.runestone.treasury.repository.McpToolInvocationRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class HitlApprovalServiceTests {

  @Mock private HitlApprovalRequestRepository hitlApprovalRequestRepository;

  @Mock private AmlInvestigationRepository amlInvestigationRepository;

  @Mock private McpToolInvocationRepository mcpToolInvocationRepository;

  @Mock private BalanceHoldRepository balanceHoldRepository;

  @Mock private BalanceHoldService balanceHoldService;

  @Mock private TreasuryAccountService treasuryAccountService;

  @Mock private UserService userService;

  @Mock private ComplianceAuditLogService complianceAuditLogService;

  @InjectMocks private HitlApprovalService hitlApprovalService;

  private HitlApprovalRequest freezeRequest;
  private HitlApprovalRequest releaseRequest;
  private BalanceHold sampleHold;
  private AmlInvestigation sampleInvestigation;

  @BeforeEach
  void setup() {
    sampleHold = new BalanceHold();
    sampleHold.setId(10L);
    sampleHold.setSourceAccountId(1L);
    sampleHold.setDestinationAccountId(2L);
    sampleHold.setAmount(BigDecimal.valueOf(100));
    sampleHold.setStatus("PENDING_HOLD");

    sampleInvestigation = new AmlInvestigation();
    sampleInvestigation.setId(20L);
    sampleInvestigation.setBalanceHoldId(10L);
    sampleInvestigation.setStatus("AWAITING_HITL_APPROVAL");

    freezeRequest = new HitlApprovalRequest();
    freezeRequest.setId(1L);
    freezeRequest.setInvestigationId(20L);
    freezeRequest.setBalanceHoldId(10L);
    freezeRequest.setProposedToolName("proposeFreezeAndReverseHold");
    freezeRequest.setStatus("PENDING_APPROVAL");

    releaseRequest = new HitlApprovalRequest();
    releaseRequest.setId(2L);
    releaseRequest.setInvestigationId(20L);
    releaseRequest.setBalanceHoldId(10L);
    releaseRequest.setProposedToolName("proposeReleaseHold");
    releaseRequest.setStatus("PENDING_APPROVAL");

    when(hitlApprovalRequestRepository.save(any(HitlApprovalRequest.class)))
        .thenAnswer(inv -> inv.getArgument(0));
    when(amlInvestigationRepository.findById(20L)).thenReturn(Optional.of(sampleInvestigation));
    when(balanceHoldRepository.findById(10L)).thenReturn(Optional.of(sampleHold));

    // Default compliance officer user (does not own account 1 or 2)
    User officer = new User();
    officer.setId(5L);
    officer.setUserName("sarah_compliance");
    officer.setTreasuryAccounts(new ArrayList<>());
    when(userService.findByUserName("sarah_compliance")).thenReturn(officer);
  }

  @Test
  void testApproveFreezeAndReverseHold() {
    when(hitlApprovalRequestRepository.findById(1L)).thenReturn(Optional.of(freezeRequest));

    HitlApprovalRequest result =
        hitlApprovalService.approveRequest(1L, "sarah_compliance", "Confirmed circular layering");

    assertNotNull(result);
    assertEquals("APPROVED_EXECUTED", result.getStatus());
    assertEquals("sarah_compliance", result.getReviewerUserName());
    verify(balanceHoldService).releaseAndReverseHold(10L);
    verify(treasuryAccountService).freezeAccount(1L);
    verify(complianceAuditLogService)
        .recordAuditEvent(
            eq("sarah_compliance"), eq("HITL_APPROVED_FREEZE_AND_REVERSE"), eq(1L), any());
  }

  @Test
  void testApproveReleaseHold() {
    when(hitlApprovalRequestRepository.findById(2L)).thenReturn(Optional.of(releaseRequest));

    HitlApprovalRequest result =
        hitlApprovalService.approveRequest(2L, "sarah_compliance", "Legitimate business transfer");

    assertNotNull(result);
    assertEquals("APPROVED_EXECUTED", result.getStatus());
    verify(balanceHoldService).settleHold(10L);
    verify(treasuryAccountService, never()).freezeAccount(anyLong());
    verify(complianceAuditLogService)
        .recordAuditEvent(eq("sarah_compliance"), eq("HITL_APPROVED_SETTLE_HOLD"), eq(2L), any());
  }

  @Test
  void testApproveThrowsSecurityExceptionOnSeparationOfDutiesViolation() {
    // Reviewer alice owns source account 1
    User alice = new User();
    alice.setId(1L);
    alice.setUserName("alice");
    TreasuryAccount acc1 = new TreasuryAccount();
    acc1.setId(1L);
    alice.setTreasuryAccounts(List.of(acc1));
    when(userService.findByUserName("alice")).thenReturn(alice);
    when(hitlApprovalRequestRepository.findById(1L)).thenReturn(Optional.of(freezeRequest));

    assertThrows(
        SecurityException.class,
        () -> hitlApprovalService.approveRequest(1L, "alice", "Self approval"));

    verify(balanceHoldService, never()).releaseAndReverseHold(anyLong());
  }

  @Test
  void testApproveThrowsIllegalStateExceptionWhenNotPending() {
    freezeRequest.setStatus("APPROVED_EXECUTED");
    when(hitlApprovalRequestRepository.findById(1L)).thenReturn(Optional.of(freezeRequest));

    assertThrows(
        IllegalStateException.class,
        () -> hitlApprovalService.approveRequest(1L, "sarah_compliance", "Re-approval attempt"));
  }

  @Test
  void testRejectFreezeProposalOverridesWithSettle() {
    when(hitlApprovalRequestRepository.findById(1L)).thenReturn(Optional.of(freezeRequest));

    HitlApprovalRequest result =
        hitlApprovalService.rejectRequest(
            1L, "sarah_compliance", "False positive; customer verified");

    assertNotNull(result);
    assertEquals("REJECTED", result.getStatus());
    verify(balanceHoldService).settleHold(10L);
    verify(complianceAuditLogService)
        .recordAuditEvent(eq("sarah_compliance"), eq("HITL_REJECTED_OVERRIDE"), eq(1L), any());
  }

  @Test
  void testRejectReleaseProposalOverridesWithFreeze() {
    when(hitlApprovalRequestRepository.findById(2L)).thenReturn(Optional.of(releaseRequest));

    HitlApprovalRequest result =
        hitlApprovalService.rejectRequest(
            2L, "sarah_compliance", "Suspicious pattern; freeze anyway");

    assertNotNull(result);
    assertEquals("REJECTED", result.getStatus());
    verify(balanceHoldService).releaseAndReverseHold(10L);
    verify(treasuryAccountService).freezeAccount(1L);
  }
}
