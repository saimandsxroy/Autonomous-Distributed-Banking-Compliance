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
