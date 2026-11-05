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
    }
  }

  /** GET /compliance/policies Returns all seeded AML regulatory policy chunks. */
  @GetMapping("/policies")
  public ResponseEntity<?> getAllPolicies() {
    try {
      List<AmlPolicyChunk> policies = amlPolicyChunkRepository.findAll();
      if (policies == null || policies.isEmpty()) {
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
      }
      return new ResponseEntity<>(policies, HttpStatus.OK);
    } catch (Exception e) {
      log.error("Failed to retrieve AML policies: {}", e.getMessage());
      return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /compliance/policies/search?query={query}&topK={topK} Returns top matching AmlPolicyChunk
   * entries ranked by cosine similarity + keyword scoring.
   */
  @GetMapping("/policies/search")
  public ResponseEntity<?> searchPolicies(
      @RequestParam String query, @RequestParam(defaultValue = "3") int topK) {
    try {
      if (query == null || query.isBlank()) {
        return new ResponseEntity<>("Query parameter 'query' is required", HttpStatus.BAD_REQUEST);
      }
      List<AmlPolicyChunk> results = amlPolicyRagService.retrieveTopPolicies(query, topK);
      if (results == null || results.isEmpty()) {
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
      }
      return new ResponseEntity<>(results, HttpStatus.OK);
    } catch (Exception e) {
      log.error("Policy search failed for query '{}': {}", query, e.getMessage());
      return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /compliance/mcp/tools Returns the MCP tool registry catalog with permission tiers
   * (READ_AUTO vs WRITE_HITL).
   */
  @GetMapping("/mcp/tools")
  public ResponseEntity<?> listMcpTools() {
    try {
      List<Map<String, Object>> tools = amlMcpToolService.listAvailableMcpTools();
      return new ResponseEntity<>(tools, HttpStatus.OK);
    } catch (Exception e) {
      log.error("Failed to list MCP tools: {}", e.getMessage());
      return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * POST /compliance/investigate/hold/{holdId} Triggers or retrieves the autonomous AML
   * investigation for the specified balance hold.
   */
  @PostMapping("/investigate/hold/{holdId}")
  public ResponseEntity<?> triggerInvestigation(@PathVariable Long holdId) {
    try {
      AmlInvestigation investigation = geminiAmlDetectiveService.investigateBalanceHold(holdId);
      if (investigation == null) {
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
      }
      return new ResponseEntity<>(investigation, HttpStatus.OK);
    } catch (IllegalArgumentException e) {
      return new ResponseEntity<>(e.getMessage(), HttpStatus.NOT_FOUND);
    } catch (Exception e) {
      log.error("Investigation failed for hold {}: {}", holdId, e.getMessage());
      return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /** GET /compliance/investigations Lists all AML investigation records. */
  @GetMapping("/investigations")
  public ResponseEntity<?> getAllInvestigations() {
    try {
      List<AmlInvestigation> list = amlInvestigationRepository.findAll();
      if (list == null || list.isEmpty()) {
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
      }
      return new ResponseEntity<>(list, HttpStatus.OK);
    } catch (Exception e) {
      log.error("Failed to retrieve investigations: {}", e.getMessage());
      return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /compliance/investigations/hold/{holdId} Returns composite investigation dossier:
   * investigation, MCP tool invocations, and HITL approval request.
   */
  @GetMapping("/investigations/hold/{holdId}")
  public ResponseEntity<?> getInvestigationByHoldId(@PathVariable Long holdId) {
    try {
      Optional<AmlInvestigation> invOpt = amlInvestigationRepository.findByBalanceHoldId(holdId);
      if (invOpt.isEmpty()) {
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
      }
      AmlInvestigation inv = invOpt.get();
      List<McpToolInvocation> invocations =
          mcpToolInvocationRepository.findByInvestigationIdOrderByIdAsc(inv.getId());
      Optional<HitlApprovalRequest> hitlOpt =
          hitlApprovalRequestRepository.findByInvestigationId(inv.getId());

      Map<String, Object> composite = new HashMap<>();
      composite.put("investigation", inv);
      composite.put("mcpToolInvocations", invocations);
      composite.put("hitlApprovalRequest", hitlOpt.orElse(null));

      return new ResponseEntity<>(composite, HttpStatus.OK);
    } catch (Exception e) {
      log.error("Failed to retrieve investigation for hold {}: {}", holdId, e.getMessage());
      return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /** GET /compliance/approvals/pending Lists all pending HITL compliance approval requests. */
  @GetMapping("/approvals/pending")
  public ResponseEntity<?> getPendingApprovals() {
    try {
      List<HitlApprovalRequest> pending =
          hitlApprovalRequestRepository.findByStatusOrderByCreatedAtDesc("PENDING_APPROVAL");
      if (pending == null || pending.isEmpty()) {
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
      }
      return new ResponseEntity<>(pending, HttpStatus.OK);
    } catch (Exception e) {
      log.error("Failed to retrieve pending approvals: {}", e.getMessage());
      return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * POST /compliance/approvals/{approvalId}/approve (also supports /approvals/id/{approvalId}/approve)
   * Approves and executes the proposed MCP tool (settle or freeze+reverse). Enforces separation of duties.
   */
  @PostMapping({"/approvals/{approvalId}/approve", "/approvals/id/{approvalId}/approve"})
  public ResponseEntity<?> approveRequest(
      @PathVariable Long approvalId, @RequestBody(required = false) Map<String, String> body) {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    String reviewer =
        (authentication != null
                && authentication.getName() != null
                && !authentication.getName().equals("anonymousUser"))
            ? authentication.getName()
            : (body != null && body.containsKey("reviewerUserName")
                ? body.get("reviewerUserName")
                : "sarah_compliance");
    String notes =
        body != null && body.get("notes") != null
            ? body.get("notes")
            : "Approved by compliance officer";
    String action = body != null ? body.get("action") : null;
    try {
      HitlApprovalRequest approved =
          action != null
              ? hitlApprovalService.approveRequest(approvalId, reviewer, notes, action)
              : hitlApprovalService.approveRequest(approvalId, reviewer, notes);
      return new ResponseEntity<>(approved, HttpStatus.OK);
    } catch (SecurityException e) {
      log.warn("403 Forbidden on approval: {}", e.getMessage());
      return new ResponseEntity<>(
          Map.of("error", e.getMessage(), "status", 403), HttpStatus.FORBIDDEN);
    } catch (IllegalStateException e) {
      log.warn("409 Conflict on approval: {}", e.getMessage());
      return new ResponseEntity<>(
          Map.of("error", e.getMessage(), "status", 409), HttpStatus.CONFLICT);
    } catch (IllegalArgumentException e) {
      return new ResponseEntity<>(
          Map.of("error", e.getMessage(), "status", 404), HttpStatus.NOT_FOUND);
    } catch (Exception e) {
      log.error("Approval execution failed for request {}: {}", approvalId, e.getMessage(), e);
      return new ResponseEntity<>(
          Map.of(
              "error",
              e.getMessage() != null ? e.getMessage() : "Approval execution failed",
              "status",
              500),
          HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * POST /compliance/approvals/{approvalId}/reject (also supports /approvals/id/{approvalId}/reject)
   * Rejects the AI recommendation and applies supervisory override.
   */
  @PostMapping({"/approvals/{approvalId}/reject", "/approvals/id/{approvalId}/reject"})
  public ResponseEntity<?> rejectRequest(
      @PathVariable Long approvalId, @RequestBody(required = false) Map<String, String> body) {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    String reviewer =
        (authentication != null
                && authentication.isAuthenticated()
                && !authentication.getName().equals("anonymousUser"))
            ? authentication.getName()
            : (body != null && body.containsKey("reviewerUserName")
                ? body.get("reviewerUserName")
                : "sarah_compliance");
    String notes =
        body != null && body.get("notes") != null
            ? body.get("notes")
            : "Rejected by compliance officer";
    try {
      HitlApprovalRequest rejected = hitlApprovalService.rejectRequest(approvalId, reviewer, notes);
      return new ResponseEntity<>(rejected, HttpStatus.OK);
    } catch (SecurityException e) {
      log.warn("403 Forbidden on rejection: {}", e.getMessage());
      return new ResponseEntity<>(
          Map.of("error", e.getMessage(), "status", 403), HttpStatus.FORBIDDEN);
    } catch (IllegalStateException e) {
      log.warn("409 Conflict on rejection: {}", e.getMessage());
      return new ResponseEntity<>(
          Map.of("error", e.getMessage(), "status", 409), HttpStatus.CONFLICT);
    } catch (IllegalArgumentException e) {
      return new ResponseEntity<>(
          Map.of("error", e.getMessage(), "status", 404), HttpStatus.NOT_FOUND);
    } catch (Exception e) {
      log.error("Rejection execution failed for request {}: {}", approvalId, e.getMessage(), e);
      return new ResponseEntity<>(
          Map.of(
              "error",
              e.getMessage() != null ? e.getMessage() : "Rejection execution failed",
              "status",
              500),
          HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /compliance/audit-logs Returns the immutable audit log trail with cryptographically
   * verified SHA-256 hash chain status.
   */
  @GetMapping("/audit-logs")
  public ResponseEntity<?> getComplianceAuditLogs() {
    try {
      Map<String, Object> result = complianceAuditLogService.getAuditLogsWithVerification();
      return new ResponseEntity<>(result, HttpStatus.OK);
    } catch (Exception e) {
      log.error("Failed to retrieve compliance audit logs: {}", e.getMessage());
      return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * POST /compliance/demo/seed-aml-scenarios Seeds a fresh live 3-hop circular AML layering
   * sequence and immediately triggers autonomous Gemini investigation and HITL queue.
   */
  @PostMapping({"/demo/seed-aml-scenarios", "/demo/seed-aml-scenario"})
  public ResponseEntity<?> seedAmlScenarios() {
    try {
      Map<String, Object> scenario = amlDemoSeederService.seedAmlScenario();
      return new ResponseEntity<>(scenario, HttpStatus.CREATED);
    } catch (Exception e) {
      log.error("Failed to seed demo AML scenario", e);
      return new ResponseEntity<>(
          Map.of("error", e.getMessage() != null ? e.getMessage() : e.getClass().getName()),
          HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /compliance/investigations/hold/{holdId}/export-sar-pdf Generates and streams the official
   * FinCEN/FATF Suspicious Activity Report (SAR) PDF dossier.
   */
  @GetMapping(
      value = "/investigations/hold/{holdId}/export-sar-pdf",
      produces = MediaType.APPLICATION_PDF_VALUE)
  public ResponseEntity<?> exportSarPdf(@PathVariable Long holdId) {
    try {
      byte[] pdfBytes = sarPdfExportService.generateSarPdf(holdId);
      HttpHeaders headers = new HttpHeaders();
      headers.setContentType(MediaType.APPLICATION_PDF);
      headers.setContentDisposition(
          org.springframework.http.ContentDisposition.attachment()
              .filename("FinCEN_SAR_Hold_" + holdId + ".pdf")
              .build());
      return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    } catch (Exception e) {
      log.error("Failed to export SAR PDF for holdId={}: {}", holdId, e.getMessage(), e);
      return new ResponseEntity<>(
          Map.of("error", "SAR PDF export failed: " + e.getMessage()),
          HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GET /compliance/metrics/telemetry Aggregates live database and runtime operational metrics for
   * SRE and supervisory oversight.
   */
  @GetMapping("/metrics/telemetry")
  public ResponseEntity<?> getTelemetryMetrics() {
    try {
      java.math.BigDecimal totalPostedLiquidityUsd =
          treasuryAccountRepository.sumUsdPostedBalance();
      long activeHoldsCount = balanceHoldRepository.countByStatus("PENDING_HOLD");
      long openReconciliationDiscrepancies =
          reconciliationDiscrepancyRepository.countByResolutionStatus("OPEN");
      long pendingMakerCheckerWires = makerCheckerWireRepository.countByStatus("PENDING_APPROVAL");
      long outboxPendingCount = outboxEventRepository.countByStatus("PENDING");
      long dlqCount = deadLetterEventRepository.count();
      long mcpAutoExecutionsCount =
          mcpToolInvocationRepository.countByExecutionStatus("AUTO_EXECUTED");

      boolean sha256ChainVerified = false;
      try {
        Map<String, Object> ver = complianceAuditLogService.getAuditLogsWithVerification();
        sha256ChainVerified = Boolean.TRUE.equals(ver.get("chainIntact"));
      } catch (Exception ex) {
        log.warn("Chain verification error during telemetry fetch: {}", ex.getMessage());
      }

      Map<String, Object> telemetry = new HashMap<>();
      telemetry.put(
          "totalPostedLiquidityUsd",
          totalPostedLiquidityUsd != null ? totalPostedLiquidityUsd : java.math.BigDecimal.ZERO);
      telemetry.put("activeHoldsCount", activeHoldsCount);
      telemetry.put("openReconciliationDiscrepancies", openReconciliationDiscrepancies);
      telemetry.put("pendingMakerCheckerWires", pendingMakerCheckerWires);
      telemetry.put("outboxPendingCount", outboxPendingCount);
      telemetry.put("dlqCount", dlqCount);
      telemetry.put("mcpAutoExecutionsCount", mcpAutoExecutionsCount);
      telemetry.put("sha256ChainVerified", sha256ChainVerified);
      telemetry.put("timestamp", java.time.Instant.now().toString());

      return new ResponseEntity<>(telemetry, HttpStatus.OK);
    } catch (Exception e) {
      log.error("Failed to aggregate compliance telemetry metrics: {}", e.getMessage(), e);
      return new ResponseEntity<>(
          Map.of("error", e.getMessage()), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
