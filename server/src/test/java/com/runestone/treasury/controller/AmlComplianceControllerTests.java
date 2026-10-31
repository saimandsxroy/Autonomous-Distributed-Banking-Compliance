package com.runestone.treasury.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.runestone.treasury.entity.AmlInvestigation;
import com.runestone.treasury.entity.AmlPolicyChunk;
import com.runestone.treasury.entity.HitlApprovalRequest;
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
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class AmlComplianceControllerTests {

  @Mock private AmlGraphDetectionService amlGraphDetectionService;

  @Mock private AmlPolicyRagService amlPolicyRagService;

  @Mock private AmlPolicyChunkRepository amlPolicyChunkRepository;

  @Mock private AmlInvestigationRepository amlInvestigationRepository;

  @Mock private McpToolInvocationRepository mcpToolInvocationRepository;

  @Mock private HitlApprovalRequestRepository hitlApprovalRequestRepository;

  @Mock private AmlMcpToolService amlMcpToolService;

  @Mock private GeminiAmlDetectiveService geminiAmlDetectiveService;

  @Mock private HitlApprovalService hitlApprovalService;

  @Mock private ComplianceAuditLogService complianceAuditLogService;

  @Mock private com.runestone.treasury.service.AmlDemoSeederService amlDemoSeederService;

  @Mock private Authentication authentication;

  @Mock private SecurityContext securityContext;

  @InjectMocks private AmlComplianceController amlComplianceController;

  private AmlPolicyChunk sampleChunk;
  private AmlInvestigation sampleInvestigation;
  private HitlApprovalRequest sampleHitlRequest;

  @BeforeEach
  void setup() {
    sampleChunk = new AmlPolicyChunk();
    sampleChunk.setId(1L);
    sampleChunk.setPolicyCode("FATF-REC-16-LAYERING");
    sampleChunk.setJurisdiction("FATF");
    sampleChunk.setTitle("Circular Round-Tripping Detection");
    sampleChunk.setCategory("CIRCULAR_LAYERING");
    sampleChunk.setContent("circular layering ring detection policy");
    sampleChunk.setCreatedAt(LocalDateTime.now());

    sampleInvestigation = new AmlInvestigation();
    sampleInvestigation.setId(10L);
    sampleInvestigation.setBalanceHoldId(5L);
    sampleInvestigation.setRiskScore(95);
    sampleInvestigation.setRiskSeverity("CRITICAL");
    sampleInvestigation.setRecommendedTool("proposeFreezeAndReverseHold");
    sampleInvestigation.setStatus("AWAITING_HITL_APPROVAL");

    sampleHitlRequest = new HitlApprovalRequest();
    sampleHitlRequest.setId(1L);
    sampleHitlRequest.setInvestigationId(10L);
    sampleHitlRequest.setBalanceHoldId(5L);
    sampleHitlRequest.setProposedToolName("proposeFreezeAndReverseHold");
    sampleHitlRequest.setStatus("PENDING_APPROVAL");
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void testGetAccountGraphReturnsOk() {
    Map<String, Object> subgraph = new HashMap<>();
    subgraph.put("accountId", 1L);
    subgraph.put("cycleDetected", false);
    subgraph.put("fanOutCount24h", 2L);
    subgraph.put("fanInCount24h", 1L);
    subgraph.put("riskLevel", "LOW");
    when(amlGraphDetectionService.getAccountSubgraph(1L)).thenReturn(subgraph);

    ResponseEntity<?> response = amlComplianceController.getAccountGraph(1L);

    assertEquals(HttpStatus.OK, response.getStatusCode());
    assertNotNull(response.getBody());
  }

  @Test
  void testGetAccountGraphReturnsNotFoundWhenEmpty() {
    when(amlGraphDetectionService.getAccountSubgraph(99L)).thenReturn(new HashMap<>());

    ResponseEntity<?> response = amlComplianceController.getAccountGraph(99L);

    assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
  }

  @Test
  void testGetAllPoliciesReturnsOk() {
    when(amlPolicyChunkRepository.findAll()).thenReturn(List.of(sampleChunk));

    ResponseEntity<?> response = amlComplianceController.getAllPolicies();

    assertEquals(HttpStatus.OK, response.getStatusCode());
    assertNotNull(response.getBody());
  }

  @Test
  void testGetAllPoliciesReturnsNotFoundWhenEmpty() {
    when(amlPolicyChunkRepository.findAll()).thenReturn(List.of());

    ResponseEntity<?> response = amlComplianceController.getAllPolicies();

    assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
  }

  @Test
  void testSearchPoliciesReturnsOk() {
    when(amlPolicyRagService.retrieveTopPolicies(anyString(), anyInt()))
        .thenReturn(List.of(sampleChunk));

    ResponseEntity<?> response = amlComplianceController.searchPolicies("circular layering", 3);

    assertEquals(HttpStatus.OK, response.getStatusCode());
    assertNotNull(response.getBody());
  }

  @Test
  void testSearchPoliciesReturnsBadRequestForBlankQuery() {
    ResponseEntity<?> response = amlComplianceController.searchPolicies("", 3);

    assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
  }

  @Test
  void testSearchPoliciesReturnsNotFoundWhenNoResults() {
    when(amlPolicyRagService.retrieveTopPolicies(anyString(), anyInt())).thenReturn(List.of());

    ResponseEntity<?> response = amlComplianceController.searchPolicies("xyz unknown query", 3);

    assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
  }

  @Test
  void testGetAccountGraphHandlesException() {
    when(amlGraphDetectionService.getAccountSubgraph(1L))
        .thenThrow(new RuntimeException("DB error"));

    ResponseEntity<?> response = amlComplianceController.getAccountGraph(1L);

    assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
  }

  @Test
  void testListMcpToolsReturnsOk() {
    when(amlMcpToolService.listAvailableMcpTools())
        .thenReturn(List.of(Map.of("toolName", "inspectTransferSubgraph")));

    ResponseEntity<?> response = amlComplianceController.listMcpTools();

    assertEquals(HttpStatus.OK, response.getStatusCode());
  }

  @Test
  void testTriggerInvestigationReturnsOk() {
    when(geminiAmlDetectiveService.investigateBalanceHold(5L)).thenReturn(sampleInvestigation);

    ResponseEntity<?> response = amlComplianceController.triggerInvestigation(5L);

    assertEquals(HttpStatus.OK, response.getStatusCode());
    assertEquals(sampleInvestigation, response.getBody());
  }

  @Test
  void testTriggerInvestigationNotFound() {
    when(geminiAmlDetectiveService.investigateBalanceHold(99L))
        .thenThrow(new IllegalArgumentException("Balance hold not found"));

    ResponseEntity<?> response = amlComplianceController.triggerInvestigation(99L);

    assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
  }

  @Test
  void testGetAllInvestigationsReturnsOk() {
    when(amlInvestigationRepository.findAll()).thenReturn(List.of(sampleInvestigation));

    ResponseEntity<?> response = amlComplianceController.getAllInvestigations();

    assertEquals(HttpStatus.OK, response.getStatusCode());
  }

  @Test
  void testGetAllInvestigationsReturnsNotFoundWhenEmpty() {
    when(amlInvestigationRepository.findAll()).thenReturn(List.of());

    ResponseEntity<?> response = amlComplianceController.getAllInvestigations();

    assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
  }

  @Test
  void testGetInvestigationByHoldIdReturnsComposite() {
    when(amlInvestigationRepository.findByBalanceHoldId(5L))
        .thenReturn(Optional.of(sampleInvestigation));
    when(mcpToolInvocationRepository.findByInvestigationIdOrderByIdAsc(10L)).thenReturn(List.of());
    when(hitlApprovalRequestRepository.findByInvestigationId(10L))
        .thenReturn(Optional.of(sampleHitlRequest));

    ResponseEntity<?> response = amlComplianceController.getInvestigationByHoldId(5L);

    assertEquals(HttpStatus.OK, response.getStatusCode());
    assertNotNull(response.getBody());
  }

  @Test
  void testGetPendingApprovalsReturnsOk() {
    when(hitlApprovalRequestRepository.findByStatusOrderByCreatedAtDesc("PENDING_APPROVAL"))
        .thenReturn(List.of(sampleHitlRequest));

    ResponseEntity<?> response = amlComplianceController.getPendingApprovals();

    assertEquals(HttpStatus.OK, response.getStatusCode());
  }

  @Test
  void testApproveRequestReturnsOk() {
    when(authentication.getName()).thenReturn("sarah_compliance");
    when(securityContext.getAuthentication()).thenReturn(authentication);
    SecurityContextHolder.setContext(securityContext);

    sampleHitlRequest.setStatus("APPROVED_EXECUTED");
    when(hitlApprovalService.approveRequest(eq(1L), eq("sarah_compliance"), anyString()))
        .thenReturn(sampleHitlRequest);

    ResponseEntity<?> response =
        amlComplianceController.approveRequest(1L, Map.of("notes", "All good"));

    assertEquals(HttpStatus.OK, response.getStatusCode());
  }

  @Test
  void testApproveRequestForbiddenOnSeparationOfDuties() {
    when(authentication.getName()).thenReturn("alice");
    when(securityContext.getAuthentication()).thenReturn(authentication);
    SecurityContextHolder.setContext(securityContext);

    when(hitlApprovalService.approveRequest(eq(1L), eq("alice"), anyString()))
        .thenThrow(new SecurityException("Separation-of-duties violation"));

    ResponseEntity<?> response = amlComplianceController.approveRequest(1L, null);

    assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
  }

  @Test
  void testApproveRequestConflictWhenAlreadyResolved() {
    when(authentication.getName()).thenReturn("sarah_compliance");
    when(securityContext.getAuthentication()).thenReturn(authentication);
    SecurityContextHolder.setContext(securityContext);

    when(hitlApprovalService.approveRequest(eq(1L), eq("sarah_compliance"), anyString()))
        .thenThrow(new IllegalStateException("Approval request already resolved"));

    ResponseEntity<?> response = amlComplianceController.approveRequest(1L, null);

    assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
  }

  @Test
  void testRejectRequestReturnsOk() {
    when(authentication.getName()).thenReturn("sarah_compliance");
    when(securityContext.getAuthentication()).thenReturn(authentication);
    SecurityContextHolder.setContext(securityContext);

    sampleHitlRequest.setStatus("REJECTED");
    when(hitlApprovalService.rejectRequest(eq(1L), eq("sarah_compliance"), anyString()))
        .thenReturn(sampleHitlRequest);

    ResponseEntity<?> response =
        amlComplianceController.rejectRequest(1L, Map.of("notes", "Rejected false positive"));

    assertEquals(HttpStatus.OK, response.getStatusCode());
  }

  @Test
  void testGetComplianceAuditLogsReturnsOk() {
    Map<String, Object> result = Map.of("chainIntact", true, "auditLogs", List.of());
    when(complianceAuditLogService.getAuditLogsWithVerification()).thenReturn(result);

    ResponseEntity<?> response = amlComplianceController.getComplianceAuditLogs();

    assertEquals(HttpStatus.OK, response.getStatusCode());
    assertNotNull(response.getBody());
  }

  @Test
  void testSeedAmlScenariosReturnsCreated() {
    Map<String, Object> scenario = Map.of("status", "SUCCESS", "balanceHoldId", 1L);
    when(amlDemoSeederService.seedAmlScenario()).thenReturn(scenario);

    ResponseEntity<?> response = amlComplianceController.seedAmlScenarios();

    assertEquals(HttpStatus.CREATED, response.getStatusCode());
    assertNotNull(response.getBody());
  }
}
