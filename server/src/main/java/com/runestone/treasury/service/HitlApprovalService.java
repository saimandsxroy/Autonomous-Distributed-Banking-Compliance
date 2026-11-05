package com.runestone.treasury.service;

import com.runestone.treasury.entity.AmlInvestigation;
import com.runestone.treasury.entity.BalanceHold;
import com.runestone.treasury.entity.HitlApprovalRequest;
import com.runestone.treasury.entity.McpToolInvocation;
import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.entity.User;
import com.runestone.treasury.exception.SeparationOfDutiesViolationException;
import com.runestone.treasury.repository.AmlInvestigationRepository;
import com.runestone.treasury.repository.BalanceHoldRepository;
import com.runestone.treasury.repository.HitlApprovalRequestRepository;
import com.runestone.treasury.repository.McpToolInvocationRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HitlApprovalService {

  private static final Logger log = LoggerFactory.getLogger(HitlApprovalService.class);

  @Autowired private HitlApprovalRequestRepository hitlApprovalRequestRepository;

  @Autowired private AmlInvestigationRepository amlInvestigationRepository;

  @Autowired private McpToolInvocationRepository mcpToolInvocationRepository;

  @Autowired private BalanceHoldRepository balanceHoldRepository;

  @Autowired private BalanceHoldService balanceHoldService;

  @Autowired private TreasuryAccountService treasuryAccountService;

  @Autowired private UserService userService;

  @Autowired private ComplianceAuditLogService complianceAuditLogService;

  @Autowired private SseTelemetryService sseTelemetryService;

  /**
   * Approves and executes a pending HITL request. Enforces strict separation-of-duties so account
   * owners cannot self-approve AML actions on their own transactions.
   */
  @Transactional
  public HitlApprovalRequest approveRequest(
      Long approvalId, String reviewerUserName, String notes) {
    return approveRequest(approvalId, reviewerUserName, notes, null);
  }

  @Transactional
  public HitlApprovalRequest approveRequest(
      Long approvalId, String reviewerUserName, String notes, String action) {
    HitlApprovalRequest request =
        hitlApprovalRequestRepository
            .findById(approvalId)
            .or(() -> hitlApprovalRequestRepository.findByInvestigationId(approvalId))
            .orElseThrow(
                () -> new IllegalArgumentException("Approval request not found: " + approvalId));

    if (!"PENDING_APPROVAL".equals(request.getStatus())) {
      throw new IllegalStateException("Approval request already resolved: " + request.getStatus());
    }

    BalanceHold hold =
        balanceHoldRepository
            .findById(request.getBalanceHoldId())
            .orElseThrow(
                () ->
                    new IllegalStateException(
                        "Balance hold not found: " + request.getBalanceHoldId()));

    // Separation of duties verification
    enforceSeparationOfDuties(reviewerUserName, hold);

    AmlInvestigation investigation =
        amlInvestigationRepository.findById(request.getInvestigationId()).orElse(null);

    String tool = request.getProposedToolName();
    boolean shouldRelease =
        "RELEASE".equalsIgnoreCase(action)
            || "proposeReleaseHold".equals(tool)
            || (notes != null
                && (notes.toLowerCase().contains("legitimate")
                    || notes.toLowerCase().contains("release")));

    if (shouldRelease) {
      // Settle hold cleanly
      balanceHoldService.settleHold(hold.getId());

      if (investigation != null) {
        investigation.setStatus("RESOLVED_RELEASED");
        amlInvestigationRepository.save(investigation);
      }

      updateMcpInvocationStatus(request.getInvestigationId(), tool, "HITL_APPROVED_EXECUTED");

      complianceAuditLogService.recordAuditEvent(
          reviewerUserName, "HITL_APPROVED_SETTLE_HOLD", request.getId(), request);

      log.info(
          "HITL APPROVED RELEASE & SETTLE: request={}, hold={} settled by officer={}",
          approvalId,
          hold.getId(),
          reviewerUserName);
    } else {
      // Freeze and reverse
      balanceHoldService.releaseAndReverseHold(hold.getId());
      treasuryAccountService.freezeAccount(hold.getSourceAccountId());

      if (investigation != null) {
        investigation.setStatus("RESOLVED_FROZEN_REVERSED");
        amlInvestigationRepository.save(investigation);
      }

      updateMcpInvocationStatus(
          request.getInvestigationId(), "proposeFreezeAndReverseHold", "HITL_APPROVED_EXECUTED");

      complianceAuditLogService.recordAuditEvent(
          reviewerUserName, "HITL_APPROVED_FREEZE_AND_REVERSE", request.getId(), request);

      log.warn(
          "HITL APPROVED FREEZE AND REVERSE: request={}, account={} frozen by officer={}",
          approvalId,
          hold.getSourceAccountId(),
          reviewerUserName);
    }

    request.setStatus("APPROVED_EXECUTED");
    request.setReviewerUserName(reviewerUserName);
    request.setReviewerNotes(notes);
    request.setResolvedAt(LocalDateTime.now());
    HitlApprovalRequest saved = hitlApprovalRequestRepository.save(request);

    if (sseTelemetryService != null) {
      sseTelemetryService.broadcast(
          "HITL_RESOLVED",
          Map.of(
              "approvalId",
              approvalId,
              "holdId",
              hold.getId(),
              "decision",
              "APPROVED",
              "reviewer",
              reviewerUserName));
    }

    return saved;
  }

  /** Rejects an HITL recommendation and applies human supervisory override. */
  @Transactional
  public HitlApprovalRequest rejectRequest(Long approvalId, String reviewerUserName, String notes) {
    HitlApprovalRequest request =
        hitlApprovalRequestRepository
            .findById(approvalId)
            .or(() -> hitlApprovalRequestRepository.findByInvestigationId(approvalId))
            .orElseThrow(
                () -> new IllegalArgumentException("Approval request not found: " + approvalId));

    if (!"PENDING_APPROVAL".equals(request.getStatus())) {
      throw new IllegalStateException("Approval request already resolved: " + request.getStatus());
    }

    BalanceHold hold =
        balanceHoldRepository
            .findById(request.getBalanceHoldId())
            .orElseThrow(
                () ->
                    new IllegalStateException(
                        "Balance hold not found: " + request.getBalanceHoldId()));

    enforceSeparationOfDuties(reviewerUserName, hold);

    AmlInvestigation investigation =
        amlInvestigationRepository.findById(request.getInvestigationId()).orElse(null);

    String tool = request.getProposedToolName();
    if ("proposeFreezeAndReverseHold".equals(tool)) {
      // Officer determined AI was too strict: override by settling the transfer cleanly
      balanceHoldService.settleHold(hold.getId());
      if (investigation != null) {
        investigation.setStatus("RESOLVED_RELEASED_OVERRIDE");
        amlInvestigationRepository.save(investigation);
      }
      updateMcpInvocationStatus(
          request.getInvestigationId(), "proposeFreezeAndReverseHold", "HITL_REJECTED");
      log.info(
          "Officer {} rejected AI freeze proposal; settled transfer as override", reviewerUserName);
    } else {
      // Officer determined AI was too lenient: override by freezing account and reversing hold
      balanceHoldService.releaseAndReverseHold(hold.getId());
      treasuryAccountService.freezeAccount(hold.getSourceAccountId());
      if (investigation != null) {
        investigation.setStatus("RESOLVED_FROZEN_OVERRIDE");
        amlInvestigationRepository.save(investigation);
      }
      updateMcpInvocationStatus(
          request.getInvestigationId(), "proposeReleaseHold", "HITL_REJECTED");
      log.warn(
          "Officer {} rejected AI release proposal; froze account as override", reviewerUserName);
    }

    request.setStatus("REJECTED");
    request.setReviewerUserName(reviewerUserName);
    request.setReviewerNotes(notes);
    request.setResolvedAt(LocalDateTime.now());
    HitlApprovalRequest saved = hitlApprovalRequestRepository.save(request);

    complianceAuditLogService.recordAuditEvent(
        reviewerUserName, "HITL_REJECTED_OVERRIDE", saved.getId(), saved);

    if (sseTelemetryService != null) {
      sseTelemetryService.broadcast(
          "HITL_RESOLVED",
          Map.of(
              "approvalId", approvalId,
              "decision", "REJECTED",
              "reviewer", reviewerUserName));
    }

    return saved;
  }

  private void enforceSeparationOfDuties(String reviewerUserName, BalanceHold hold) {
    User reviewer = userService.findByUserName(reviewerUserName);
    if (reviewer != null) {
      // 1. FINRA Rule 3110 Interested Party Verification (account ownership check)
      if (reviewer.getTreasuryAccounts() != null) {
        Set<Long> reviewerAccountIds =
            reviewer.getTreasuryAccounts().stream()
                .map(TreasuryAccount::getId)
                .collect(Collectors.toSet());

        if (reviewerAccountIds.contains(hold.getSourceAccountId())
            || reviewerAccountIds.contains(hold.getDestinationAccountId())) {
          Long offendingAccountId =
              reviewerAccountIds.contains(hold.getSourceAccountId())
                  ? hold.getSourceAccountId()
                  : hold.getDestinationAccountId();
          log.warn(
              "Separation-of-duties violation: user {} attempted to approve action on owned account (src={}, dst={})",
              reviewerUserName,
              hold.getSourceAccountId(),
              hold.getDestinationAccountId());
          throw new SeparationOfDutiesViolationException(
              "SEPARATION_OF_DUTIES_VIOLATION: FINRA Rule 3110: Approver '"
                  + reviewerUserName
                  + "' cannot be an interested party on Account #"
                  + offendingAccountId);
        }
      }

      // 2. Supervisory Compliance Officer Credentials Verification
      if (reviewer.getRoles() != null && !reviewer.getRoles().isEmpty()) {
        boolean isSupervisor =
            reviewer.getRoles().stream()
                .anyMatch(
                    r -> "COMPLIANCE_OFFICER".equalsIgnoreCase(r) || "ADMIN".equalsIgnoreCase(r));
        if (!isSupervisor) {
          log.warn(
              "Supervisory role violation: user {} lacks COMPLIANCE_OFFICER role",
              reviewerUserName);
          throw new SeparationOfDutiesViolationException(
              "SEPARATION_OF_DUTIES_VIOLATION: FINRA Rule 3110: Approver '"
                  + reviewerUserName
                  + "' lacks supervisory compliance officer authorization.");
        }
      }
    }
  }

  private void updateMcpInvocationStatus(Long investigationId, String toolName, String status) {
    List<McpToolInvocation> invocations =
        mcpToolInvocationRepository.findByInvestigationIdOrderByIdAsc(investigationId);
    for (McpToolInvocation inv : invocations) {
      if (toolName.equals(inv.getToolName())) {
        inv.setExecutionStatus(status);
        mcpToolInvocationRepository.save(inv);
      }
    }
  }
}
