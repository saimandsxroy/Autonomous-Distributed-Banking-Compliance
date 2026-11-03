package com.runestone.treasury.controller;

import com.runestone.treasury.entity.AmlInvestigation;
import com.runestone.treasury.entity.AmlPolicyChunk;
import com.runestone.treasury.entity.HitlApprovalRequest;
import com.runestone.treasury.entity.McpToolInvocation;
import com.runestone.treasury.repository.AmlInvestigationRepository;
import com.runestone.treasury.repository.AmlPolicyChunkRepository;
import com.runestone.treasury.repository.HitlApprovalRequestRepository;
import com.runestone.treasury.repository.McpToolInvocationRepository;
import com.runestone.treasury.service.AmlGraphDetectionService;
import com.runestone.treasury.service.AmlMcpToolService;
import com.runestone.treasury.service.AmlPolicyRagService;
import com.runestone.treasury.service.ComplianceAuditLogService;
import com.runestone.treasury.service.GeminiAmlDetectiveService;
import com.runestone.treasury.service.HitlApprovalService;
import com.runestone.treasury.service.SarPdfExportService;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/compliance")
public class AmlComplianceController {

  private static final Logger log = LoggerFactory.getLogger(AmlComplianceController.class);

  @Autowired private AmlGraphDetectionService amlGraphDetectionService;

  @Autowired private AmlPolicyRagService amlPolicyRagService;

  @Autowired private AmlPolicyChunkRepository amlPolicyChunkRepository;

  @Autowired private AmlInvestigationRepository amlInvestigationRepository;

  @Autowired private McpToolInvocationRepository mcpToolInvocationRepository;

  @Autowired private HitlApprovalRequestRepository hitlApprovalRequestRepository;

  @Autowired private AmlMcpToolService amlMcpToolService;

  @Autowired private GeminiAmlDetectiveService geminiAmlDetectiveService;

  @Autowired private HitlApprovalService hitlApprovalService;

  @Autowired private ComplianceAuditLogService complianceAuditLogService;

  @Autowired private com.runestone.treasury.service.AmlDemoSeederService amlDemoSeederService;

  @Autowired private SarPdfExportService sarPdfExportService;

  @Autowired
  private com.runestone.treasury.repository.TreasuryAccountRepository treasuryAccountRepository;

  @Autowired private com.runestone.treasury.repository.BalanceHoldRepository balanceHoldRepository;

  @Autowired
  private com.runestone.treasury.repository.ReconciliationDiscrepancyRepository
      reconciliationDiscrepancyRepository;

  @Autowired
  private com.runestone.treasury.repository.MakerCheckerWireRepository makerCheckerWireRepository;

  @Autowired private com.runestone.treasury.repository.OutboxEventRepository outboxEventRepository;

  @Autowired
  private com.runestone.treasury.repository.DeadLetterEventRepository deadLetterEventRepository;

  /**
   * GET /compliance/graph/account/{accountId} Returns the 5-hop subgraph analysis, cycle detection
   * status, and fan-out/fan-in metrics for the given account.
   */
  @GetMapping("/graph/account/{accountId}")
  public ResponseEntity<?> getAccountGraph(@PathVariable Long accountId) {
    try {
      Map<String, Object> subgraph = amlGraphDetectionService.getAccountSubgraph(accountId);
      if (subgraph == null || subgraph.isEmpty()) {
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
      }
      return new ResponseEntity<>(subgraph, HttpStatus.OK);
    } catch (Exception e) {
      log.error("Failed to retrieve subgraph for account {}: {}", accountId, e.getMessage());
      return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
