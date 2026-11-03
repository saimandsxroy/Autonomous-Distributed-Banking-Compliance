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
