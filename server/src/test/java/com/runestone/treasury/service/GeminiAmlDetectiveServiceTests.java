package com.runestone.treasury.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.runestone.treasury.api.response.GeminiResponse;
import com.runestone.treasury.cache.AppCache;
import com.runestone.treasury.entity.AmlInvestigation;
import com.runestone.treasury.entity.AmlPolicyChunk;
import com.runestone.treasury.entity.BalanceHold;
import com.runestone.treasury.repository.AmlInvestigationRepository;
import com.runestone.treasury.repository.BalanceHoldRepository;
import com.runestone.treasury.repository.McpToolInvocationRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
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
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class GeminiAmlDetectiveServiceTests {

  @Mock private BalanceHoldRepository balanceHoldRepository;

  @Mock private AmlInvestigationRepository amlInvestigationRepository;

  @Mock private McpToolInvocationRepository mcpToolInvocationRepository;

  @Mock private AmlMcpToolService amlMcpToolService;

  @Mock private ComplianceAuditLogService complianceAuditLogService;

  @Mock private AppCache appCache;

  @Mock private RestTemplate restTemplate;

  @Spy private ObjectMapper objectMapper = new ObjectMapper();

  @InjectMocks private GeminiAmlDetectiveService geminiAmlDetectiveService;

  private BalanceHold circularHold;
  private BalanceHold highValueHold;

  @BeforeEach
  void setup() {
    circularHold = new BalanceHold();
    circularHold.setId(10L);
    circularHold.setSourceAccountId(1L);
    circularHold.setDestinationAccountId(2L);
    circularHold.setAmount(BigDecimal.valueOf(100));
    circularHold.setCurrency("USD");
    circularHold.setStatus("PENDING_HOLD");
    circularHold.setRiskReason("CIRCULAR_RING_DETECTED: path=2->...-> 1");
    circularHold.setCreatedAt(LocalDateTime.now());

    highValueHold = new BalanceHold();
    highValueHold.setId(20L);
    highValueHold.setSourceAccountId(1L);
    highValueHold.setDestinationAccountId(2L);
    highValueHold.setAmount(BigDecimal.valueOf(15000));
    highValueHold.setCurrency("USD");
    highValueHold.setStatus("PENDING_HOLD");
    highValueHold.setRiskReason("HIGH_VALUE_TRANSFER: amount=15000.00 >= threshold=10000");
    highValueHold.setCreatedAt(LocalDateTime.now());

    when(amlInvestigationRepository.save(any(AmlInvestigation.class)))
        .thenAnswer(
            inv -> {
              AmlInvestigation a = inv.getArgument(0);
              a.setId(50L);
              return a;
            });

    AmlPolicyChunk chunk = new AmlPolicyChunk();
    chunk.setPolicyCode("FATF-REC-16-LAYERING");
    when(amlMcpToolService.searchAmlCompliancePolicies(any(), anyString()))
        .thenReturn(List.of(chunk));
    when(amlMcpToolService.inspectTransferSubgraph(any(), anyLong()))
        .thenReturn(Map.of("nodes", List.of()));
    when(amlMcpToolService.getAccountVelocityProfile(any(), anyLong()))
        .thenReturn(Map.of("availableBalance", BigDecimal.valueOf(1000)));
  }

  @Test
  void testInvestigateBalanceHoldIdempotent() {
    AmlInvestigation existing = new AmlInvestigation();
    existing.setId(99L);
    existing.setBalanceHoldId(10L);
    when(amlInvestigationRepository.findByBalanceHoldId(10L)).thenReturn(Optional.of(existing));

    AmlInvestigation result = geminiAmlDetectiveService.investigateBalanceHold(10L);

    assertNotNull(result);
    assertEquals(99L, result.getId());
    verify(amlMcpToolService, never()).inspectTransferSubgraph(any(), anyLong());
    verify(amlInvestigationRepository, never()).save(any(AmlInvestigation.class));
  }

  @Test
  void testInvestigateCircularRingHold() {
    when(amlInvestigationRepository.findByBalanceHoldId(10L)).thenReturn(Optional.empty());
    when(balanceHoldRepository.findById(10L)).thenReturn(Optional.of(circularHold));

    AmlInvestigation result = geminiAmlDetectiveService.investigateBalanceHold(10L);

    assertNotNull(result);
    assertEquals(95, result.getRiskScore());
    assertEquals("CRITICAL", result.getRiskSeverity());
    assertEquals("proposeFreezeAndReverseHold", result.getRecommendedTool());
    verify(amlMcpToolService).proposeFreezeAndReverseHold(eq(50L), eq(10L), eq(true), anyString());
    verify(complianceAuditLogService)
        .recordAuditEvent(
            eq("GEMINI_AML_DETECTIVE"), eq("AI_AML_INVESTIGATION_COMPLETED"), anyLong(), any());
  }

  @Test
  void testInvestigateHighValueHold() {
    when(amlInvestigationRepository.findByBalanceHoldId(20L)).thenReturn(Optional.empty());
    when(balanceHoldRepository.findById(20L)).thenReturn(Optional.of(highValueHold));

    AmlInvestigation result = geminiAmlDetectiveService.investigateBalanceHold(20L);

    assertNotNull(result);
    assertEquals(65, result.getRiskScore());
    assertEquals("MEDIUM", result.getRiskSeverity());
    assertEquals("proposeReleaseHold", result.getRecommendedTool());
    verify(amlMcpToolService).proposeReleaseHold(eq(50L), eq(20L), anyString());
  }

  @Test
  void testInvestigateWithLiveGeminiResponse() {
    org.springframework.test.util.ReflectionTestUtils.setField(
        geminiAmlDetectiveService, "configuredApiKey", "dummy-test-key");
    when(amlInvestigationRepository.findByBalanceHoldId(10L)).thenReturn(Optional.empty());
    when(balanceHoldRepository.findById(10L)).thenReturn(Optional.of(circularHold));
    when(appCache.get(AppCache.Keys.GEMINI_API_URL.name()))
        .thenReturn(
            "https://generativelanguage.googleapis.com/v1beta/models/<MODEL_NAME>:generateContent?key=<API_KEY>");
    when(appCache.get(AppCache.Keys.GEMINI_MODEL_NAME.name())).thenReturn("gemini-2.5-flash");

    GeminiResponse mockResp = new GeminiResponse();
    GeminiResponse.Candidate cand = new GeminiResponse.Candidate();
    GeminiResponse.Content content = new GeminiResponse.Content();
    GeminiResponse.Part part = new GeminiResponse.Part();
    part.setText(
        "{\"riskScore\": 98, \"riskSeverity\": \"CRITICAL\", \"executiveSummary\": \"Severe loop detected\", \"citedPolicyCodes\": \"FATF-REC-16\", \"recommendedTool\": \"proposeFreezeAndReverseHold\", \"toolRationale\": \"Freeze immediately\"}");
    content.setParts(List.of(part));
    cand.setContent(content);
    mockResp.setCandidates(List.of(cand));

    when(restTemplate.exchange(
            anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(GeminiResponse.class)))
        .thenReturn(new ResponseEntity<>(mockResp, HttpStatus.OK));

    AmlInvestigation result = geminiAmlDetectiveService.investigateBalanceHold(10L);

    assertNotNull(result);
    assertEquals(98, result.getRiskScore());
    assertEquals("CRITICAL", result.getRiskSeverity());
    assertEquals("Severe loop detected", result.getExecutiveSummary());
    assertEquals("proposeFreezeAndReverseHold", result.getRecommendedTool());
  }
}
