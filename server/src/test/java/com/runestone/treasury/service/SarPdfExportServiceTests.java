package com.runestone.treasury.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.itextpdf.text.pdf.PdfReader;
import com.itextpdf.text.pdf.parser.PdfTextExtractor;
import com.runestone.treasury.entity.AmlInvestigation;
import com.runestone.treasury.entity.BalanceHold;
import com.runestone.treasury.entity.ComplianceAuditLog;
import com.runestone.treasury.entity.HitlApprovalRequest;
import com.runestone.treasury.entity.McpToolInvocation;
import com.runestone.treasury.repository.AmlInvestigationRepository;
import com.runestone.treasury.repository.BalanceHoldRepository;
import com.runestone.treasury.repository.ComplianceAuditLogRepository;
import com.runestone.treasury.repository.HitlApprovalRequestRepository;
import com.runestone.treasury.repository.McpToolInvocationRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SarPdfExportServiceTests {

  @Mock private AmlInvestigationRepository amlInvestigationRepository;

  @Mock private HitlApprovalRequestRepository hitlApprovalRequestRepository;

  @Mock private McpToolInvocationRepository mcpToolInvocationRepository;

  @Mock private BalanceHoldRepository balanceHoldRepository;

  @Mock private ComplianceAuditLogRepository complianceAuditLogRepository;

  @Mock private AmlGraphDetectionService amlGraphDetectionService;

  @InjectMocks private SarPdfExportService sarPdfExportService;

  @Test
  void testGenerateSarPdfReturnsValidPdfBytes() throws Exception {
    Long holdId = 42L;

    BalanceHold hold = new BalanceHold();
    hold.setId(holdId);
    hold.setSourceAccountId(10L);
    hold.setDestinationAccountId(20L);
    hold.setAmount(new BigDecimal("15000.00"));
    hold.setCurrency("USD");
    hold.setStatus("PENDING_HOLD");
    hold.setRiskReason("CIRCULAR_RING_DETECTED");
    hold.setCreatedAt(LocalDateTime.now().minusHours(1));
    hold.setExpiresAt(LocalDateTime.now().plusHours(23));
    when(balanceHoldRepository.findById(holdId)).thenReturn(Optional.of(hold));

    AmlInvestigation inv = new AmlInvestigation();
    inv.setId(100L);
    inv.setBalanceHoldId(holdId);
    inv.setRiskScore(92);
    inv.setRiskSeverity("CRITICAL");
    inv.setExecutiveSummary(
        "Automated Gemini AML Detective detected a high-velocity 3-hop circular fund cycle.");
    inv.setCitedPolicyCodes("BSA-31-CFR-1010,PATRIOT-ACT-352");
    inv.setRecommendedTool("proposeFreezeAndReverseHold");
    when(amlInvestigationRepository.findByBalanceHoldId(holdId)).thenReturn(Optional.of(inv));

    HitlApprovalRequest hitl = new HitlApprovalRequest();
    hitl.setId(200L);
    hitl.setInvestigationId(100L);
    hitl.setStatus("APPROVED");
    hitl.setReviewerUserName("sarah_compliance");
    hitl.setReviewerNotes("Confirmed layering pattern; hold frozen and reversed.");
    hitl.setResolvedAt(LocalDateTime.now());
    when(hitlApprovalRequestRepository.findByInvestigationId(100L)).thenReturn(Optional.of(hitl));

    McpToolInvocation tool1 = new McpToolInvocation();
    tool1.setId(1L);
    tool1.setInvestigationId(100L);
    tool1.setToolName("proposeFreezeAndReverseHold");
    tool1.setPermissionTier("SUPERVISOR_ACTION");
    tool1.setExecutionStatus("PENDING_HITL");
    tool1.setArgumentsJson("{\"holdId\":42}");
    tool1.setOutputJson("{\"status\":\"QUEUED\"}");
    when(mcpToolInvocationRepository.findByInvestigationIdOrderByIdAsc(100L))
        .thenReturn(List.of(tool1));

    ComplianceAuditLog audit1 = new ComplianceAuditLog();
    audit1.setId(1L);
    audit1.setActorUserName("sarah_compliance");
    audit1.setActionType("HITL_APPROVED");
    audit1.setRecordHash("abc123def4567890123456789012345678901234567890123456789012345678");
    when(complianceAuditLogRepository.findAllByOrderByIdAsc()).thenReturn(List.of(audit1));

    when(amlGraphDetectionService.getAccountSubgraph(10L))
        .thenReturn(
            Map.of(
                "cycleDetected",
                true,
                "fanOutRatio",
                3.5,
                "nodes",
                List.of(
                    Map.of("accountId", 10L, "isOrigin", true),
                    Map.of("accountId", 20L, "isOrigin", false))));

    byte[] pdfBytes = sarPdfExportService.generateSarPdf(holdId);

    assertThat(pdfBytes).isNotNull();
    assertThat(pdfBytes.length).isGreaterThan(500);

    // Verify PDF header magic bytes %PDF-
    String pdfMagic = new String(Arrays.copyOf(pdfBytes, 5));
    assertThat(pdfMagic).isEqualTo("%PDF-");

    // Extract text from generated PDF and assert key compliance content
    PdfReader reader = new PdfReader(pdfBytes);
    StringBuilder sb = new StringBuilder();
    for (int i = 1; i <= reader.getNumberOfPages(); i++) {
      sb.append(PdfTextExtractor.getTextFromPage(reader, i)).append("\n");
    }
    reader.close();

    String pdfContent = sb.toString();
    assertThat(pdfContent).contains("RUNESTONE TREASURY — SUSPICIOUS ACTIVITY REPORT");
    assertThat(pdfContent).contains("SECTION 1 — INVESTIGATION METADATA");
    assertThat(pdfContent).contains("SECTION 2 — 5-HOP SUBGRAPH ANALYSIS");
    assertThat(pdfContent).contains("SECTION 3 — AI EXECUTIVE SUMMARY + CITED REGULATORY STATUTES");
    assertThat(pdfContent).contains("SECTION 4 — MCP TOOL EXECUTION AUDIT");
    assertThat(pdfContent).contains("SECTION 5 — HITL DECISION + SHA-256 AUDIT CHAIN SEAL");
    assertThat(pdfContent).contains("CIRCULAR_RING_DETECTED");
    assertThat(pdfContent).contains("sarah_compliance");
  }

  @Test
  void testGenerateSarPdfGracefulWhenEntitiesMissing() throws Exception {
    Long holdId = 999L;
    when(balanceHoldRepository.findById(holdId)).thenReturn(Optional.empty());
    when(amlInvestigationRepository.findByBalanceHoldId(holdId)).thenReturn(Optional.empty());
    when(amlGraphDetectionService.getAccountSubgraph(holdId)).thenReturn(Map.of());
    when(complianceAuditLogRepository.findAllByOrderByIdAsc()).thenReturn(List.of());

    byte[] pdfBytes = sarPdfExportService.generateSarPdf(holdId);

    assertThat(pdfBytes).isNotNull();
    assertThat(new String(Arrays.copyOf(pdfBytes, 5))).isEqualTo("%PDF-");
  }
}
