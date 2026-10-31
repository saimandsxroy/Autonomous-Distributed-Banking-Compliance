package com.runestone.treasury.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.runestone.treasury.cache.AppCache;
import com.runestone.treasury.entity.AmlPolicyChunk;
import com.runestone.treasury.entity.HitlApprovalRequest;
import com.runestone.treasury.entity.McpToolInvocation;
import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.repository.HitlApprovalRequestRepository;
import com.runestone.treasury.repository.McpToolInvocationRepository;
import com.runestone.treasury.repository.TreasuryAccountRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AmlMcpToolServiceTests {

  @Mock private McpToolInvocationRepository mcpToolInvocationRepository;

  @Mock private HitlApprovalRequestRepository hitlApprovalRequestRepository;

  @Mock private AmlGraphDetectionService amlGraphDetectionService;

  @Mock private AmlPolicyRagService amlPolicyRagService;

  @Mock private TreasuryAccountRepository treasuryAccountRepository;

  @Mock private AppCache appCache;

  @Spy private ObjectMapper objectMapper = new ObjectMapper();

  @InjectMocks private AmlMcpToolService amlMcpToolService;

  @BeforeEach
  void setup() {
    when(hitlApprovalRequestRepository.save(any(HitlApprovalRequest.class)))
        .thenAnswer(
            invocation -> {
              HitlApprovalRequest req = invocation.getArgument(0);
              req.setId(101L);
              return req;
            });
  }

  @Test
  void testListAvailableMcpTools() {
    List<Map<String, Object>> tools = amlMcpToolService.listAvailableMcpTools();

    assertNotNull(tools);
    assertEquals(5, tools.size());

    long readAutoCount =
        tools.stream().filter(t -> "READ_AUTO".equals(t.get("permissionTier"))).count();
    long writeHitlCount =
        tools.stream().filter(t -> "WRITE_HITL".equals(t.get("permissionTier"))).count();

    assertEquals(3, readAutoCount);
    assertEquals(2, writeHitlCount);
  }

  @Test
  void testInspectTransferSubgraph() {
    Map<String, Object> mockGraph = Map.of("accountId", 1L, "cycleDetected", false);
    when(amlGraphDetectionService.getAccountSubgraph(1L)).thenReturn(mockGraph);

    Map<String, Object> result = amlMcpToolService.inspectTransferSubgraph(10L, 1L);

    assertNotNull(result);
    assertEquals(1L, result.get("accountId"));
    verify(mcpToolInvocationRepository).save(any(McpToolInvocation.class));
  }

  @Test
  void testGetAccountVelocityProfile() {
    TreasuryAccount acc = new TreasuryAccount();
    acc.setId(1L);
    acc.setAvailableBalance(BigDecimal.valueOf(1000));
    acc.setHeldBalance(BigDecimal.valueOf(50));
    acc.setPostedBalance(BigDecimal.valueOf(1050));
    acc.setStatus("ACTIVE");
    acc.setCurrency("USD");
    when(treasuryAccountRepository.findById(1L)).thenReturn(Optional.of(acc));
    when(appCache.get("VELOCITY_MAX_TX_2M")).thenReturn("5");

    Map<String, Object> profile = amlMcpToolService.getAccountVelocityProfile(10L, 1L);

    assertNotNull(profile);
    assertEquals(BigDecimal.valueOf(1000), profile.get("availableBalance"));
    verify(mcpToolInvocationRepository).save(any(McpToolInvocation.class));
  }

  @Test
  void testSearchAmlCompliancePolicies() {
    AmlPolicyChunk chunk = new AmlPolicyChunk();
    chunk.setPolicyCode("FATF-REC-16-LAYERING");
    when(amlPolicyRagService.retrieveTopPolicies(anyString(), anyInt())).thenReturn(List.of(chunk));

    List<AmlPolicyChunk> results =
        amlMcpToolService.searchAmlCompliancePolicies(10L, "circular layering");

    assertNotNull(results);
    assertEquals(1, results.size());
    verify(mcpToolInvocationRepository).save(any(McpToolInvocation.class));
  }

  @Test
  void testProposeReleaseHold() {
    HitlApprovalRequest req =
        amlMcpToolService.proposeReleaseHold(10L, 5L, "Clean customer profile");

    assertNotNull(req);
    assertEquals("proposeReleaseHold", req.getProposedToolName());
    assertEquals("PENDING_APPROVAL", req.getStatus());
    verify(mcpToolInvocationRepository).save(any(McpToolInvocation.class));
    verify(hitlApprovalRequestRepository).save(any(HitlApprovalRequest.class));
  }

  @Test
  void testProposeFreezeAndReverseHold() {
    HitlApprovalRequest req =
        amlMcpToolService.proposeFreezeAndReverseHold(10L, 5L, true, "Circular ring detected");

    assertNotNull(req);
    assertEquals("proposeFreezeAndReverseHold", req.getProposedToolName());
    assertEquals("PENDING_APPROVAL", req.getStatus());
    verify(mcpToolInvocationRepository).save(any(McpToolInvocation.class));
    verify(hitlApprovalRequestRepository).save(any(HitlApprovalRequest.class));
  }
}
