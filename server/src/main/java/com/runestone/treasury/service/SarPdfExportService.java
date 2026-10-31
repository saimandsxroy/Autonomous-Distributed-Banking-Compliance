package com.runestone.treasury.service;

import com.itextpdf.text.BaseColor;
import com.itextpdf.text.Chunk;
import com.itextpdf.text.Document;
import com.itextpdf.text.Element;
import com.itextpdf.text.Font;
import com.itextpdf.text.PageSize;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.Phrase;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
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
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class SarPdfExportService {

  private static final Logger log = LoggerFactory.getLogger(SarPdfExportService.class);
  private static final DateTimeFormatter DTF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

  @Autowired private AmlInvestigationRepository amlInvestigationRepository;
  @Autowired private HitlApprovalRequestRepository hitlApprovalRequestRepository;
  @Autowired private McpToolInvocationRepository mcpToolInvocationRepository;
  @Autowired private BalanceHoldRepository balanceHoldRepository;
  @Autowired private ComplianceAuditLogRepository complianceAuditLogRepository;
  @Autowired private AmlGraphDetectionService amlGraphDetectionService;

  public byte[] generateSarPdf(Long holdId) throws Exception {
    log.info("Generating SAR PDF for holdId={}", holdId);

    ByteArrayOutputStream baos = new ByteArrayOutputStream();
    Document document = new Document(PageSize.A4, 40, 40, 40, 40);
    PdfWriter.getInstance(document, baos);
    document.open();

    Font titleFont = new Font(Font.FontFamily.HELVETICA, 14, Font.BOLD);
    Font headingFont = new Font(Font.FontFamily.HELVETICA, 11, Font.BOLD);
    Font normalFont = new Font(Font.FontFamily.HELVETICA, 9, Font.NORMAL);
    Font boldFont = new Font(Font.FontFamily.HELVETICA, 9, Font.BOLD);
    Font redFont = new Font(Font.FontFamily.HELVETICA, 9, Font.BOLD, BaseColor.RED);
    Font orangeFont = new Font(Font.FontFamily.HELVETICA, 9, Font.BOLD, new BaseColor(220, 120, 0));
    Font greenFont = new Font(Font.FontFamily.HELVETICA, 9, Font.BOLD, new BaseColor(0, 150, 0));

    // === HEADER ===
    Paragraph title = new Paragraph("RUNESTONE TREASURY — SUSPICIOUS ACTIVITY REPORT", titleFont);
    title.setAlignment(Element.ALIGN_CENTER);
    document.add(title);

    Paragraph subtitle =
        new Paragraph("FinCEN / FATF Compliance Filing — CONFIDENTIAL", normalFont);
    subtitle.setAlignment(Element.ALIGN_CENTER);
    document.add(subtitle);

    document.add(new Paragraph("Filing Date: " + LocalDateTime.now().format(DTF), normalFont));
    document.add(Chunk.NEWLINE);

    // === SECTION 1: Investigation Metadata ===
    document.add(new Paragraph("SECTION 1 — INVESTIGATION METADATA", headingFont));
    document.add(Chunk.NEWLINE);

    Optional<BalanceHold> holdOpt = balanceHoldRepository.findById(holdId);
    BalanceHold hold = holdOpt.orElse(null);

    Optional<AmlInvestigation> invOpt =
        (hold != null) ? amlInvestigationRepository.findByBalanceHoldId(holdId) : Optional.empty();
    AmlInvestigation investigation = invOpt.orElse(null);

    PdfPTable metaTable = new PdfPTable(2);
    metaTable.setWidthPercentage(100);
    metaTable.setWidths(new float[] {1.2f, 2.8f});

    addTableRow(metaTable, "Case ID (Hold ID)", String.valueOf(holdId), boldFont, normalFont);

    if (hold != null) {
      addTableRow(
          metaTable,
          "Source Account ID",
          String.valueOf(hold.getSourceAccountId()),
          boldFont,
          normalFont);
      addTableRow(
          metaTable,
          "Destination Account ID",
          String.valueOf(hold.getDestinationAccountId()),
          boldFont,
          normalFont);
      addTableRow(
          metaTable,
          "Hold Amount",
          hold.getAmount() + " " + hold.getCurrency(),
          boldFont,
          normalFont);
      addTableRow(metaTable, "Hold Status", hold.getStatus(), boldFont, normalFont);
      addTableRow(
          metaTable,
          "Created At",
          hold.getCreatedAt() != null ? hold.getCreatedAt().format(DTF) : "N/A",
          boldFont,
          normalFont);
      addTableRow(
          metaTable,
          "Expires At",
          hold.getExpiresAt() != null ? hold.getExpiresAt().format(DTF) : "N/A",
          boldFont,
          normalFont);
      addTableRow(
          metaTable,
          "Risk Reason",
          hold.getRiskReason() != null ? hold.getRiskReason() : "N/A",
          boldFont,
          normalFont);
    }

    if (investigation != null) {
      Integer riskScore = investigation.getRiskScore();
      Font riskFont =
          (riskScore != null && riskScore >= 80)
              ? redFont
              : (riskScore != null && riskScore >= 50) ? orangeFont : greenFont;
      PdfPCell riskLabel = new PdfPCell(new Phrase("Risk Score", boldFont));
      riskLabel.setBorder(0);
      riskLabel.setPaddingBottom(4);
      metaTable.addCell(riskLabel);
      PdfPCell riskVal = new PdfPCell(new Phrase(String.valueOf(riskScore), riskFont));
      riskVal.setBorder(0);
      riskVal.setPaddingBottom(4);
      metaTable.addCell(riskVal);
      addTableRow(
          metaTable, "Risk Severity", investigation.getRiskSeverity(), boldFont, normalFont);
      addTableRow(
          metaTable, "Recommended Tool", investigation.getRecommendedTool(), boldFont, normalFont);
    }

    document.add(metaTable);
    document.add(Chunk.NEWLINE);

    // === SECTION 2: 5-Hop Subgraph Analysis ===
    document.add(new Paragraph("SECTION 2 — 5-HOP SUBGRAPH ANALYSIS", headingFont));
    document.add(Chunk.NEWLINE);

    Long sourceAccountId = (hold != null) ? hold.getSourceAccountId() : holdId;
    try {
      Map<String, Object> subgraph = amlGraphDetectionService.getAccountSubgraph(sourceAccountId);
      if (subgraph != null && !subgraph.isEmpty()) {
        Boolean cycleDetected = (Boolean) subgraph.get("cycleDetected");
        Object fanOut = subgraph.get("fanOutRatio");
        document.add(
            new Paragraph(
                "Cycle Detected: "
                    + (Boolean.TRUE.equals(cycleDetected) ? "YES (CIRCULAR LAYER DETECTED)" : "NO")
                    + "   |   Fan-Out Ratio: "
                    + (fanOut != null ? fanOut.toString() : "0.0"),
                boldFont));
        document.add(Chunk.NEWLINE);

        PdfPTable subgraphTable = new PdfPTable(3);
        subgraphTable.setWidthPercentage(100);
        subgraphTable.setWidths(new float[] {1.5f, 2f, 1.5f});
        String[] subgraphHeaders = {"Node Account ID", "Role", "Cycle Participant"};
        for (String h : subgraphHeaders) {
          PdfPCell cell = new PdfPCell(new Phrase(h, boldFont));
          cell.setBackgroundColor(new BaseColor(230, 230, 230));
          cell.setPadding(5);
          subgraphTable.addCell(cell);
        }

        Object nodes = subgraph.get("nodes");
        if (nodes instanceof List) {
          @SuppressWarnings("unchecked")
          List<Map<String, Object>> nodeList = (List<Map<String, Object>>) nodes;
          for (Map<String, Object> node : nodeList) {
            Object accId = node.get("accountId");
            Boolean isOrigin = (Boolean) node.get("isOrigin");
            PdfPCell c1 =
                new PdfPCell(new Phrase(String.valueOf(accId != null ? accId : "N/A"), normalFont));
            PdfPCell c2 =
                new PdfPCell(
                    new Phrase(
                        Boolean.TRUE.equals(isOrigin) ? "ORIGIN (Root Node)" : "INTERMEDIARY",
                        normalFont));
            PdfPCell c3 =
                new PdfPCell(
                    new Phrase(Boolean.TRUE.equals(cycleDetected) ? "YES" : "NO", normalFont));
            c1.setPadding(4);
            c2.setPadding(4);
            c3.setPadding(4);
            subgraphTable.addCell(c1);
            subgraphTable.addCell(c2);
            subgraphTable.addCell(c3);
          }
        } else {
          subgraphTable.addCell(new Phrase(String.valueOf(sourceAccountId), normalFont));
          subgraphTable.addCell(new Phrase("ORIGIN", normalFont));
          subgraphTable.addCell(
              new Phrase(Boolean.TRUE.equals(cycleDetected) ? "YES" : "NO", normalFont));
        }
        document.add(subgraphTable);
      } else {
        document.add(
            new Paragraph("No subgraph data available for account " + sourceAccountId, normalFont));
      }
    } catch (Exception e) {
      log.warn("Could not retrieve subgraph for SAR PDF: {}", e.getMessage());
      document.add(new Paragraph("Subgraph analysis unavailable: " + e.getMessage(), normalFont));
    }
    document.add(Chunk.NEWLINE);

    // === SECTION 3: AI Executive Summary + Cited Regulatory Statutes ===
    document.add(
        new Paragraph("SECTION 3 — AI EXECUTIVE SUMMARY + CITED REGULATORY STATUTES", headingFont));
    document.add(Chunk.NEWLINE);
    addSection3(document, investigation, normalFont, headingFont);

    // === SECTION 4: MCP Tool Execution Audit ===
    document.add(new Paragraph("SECTION 4 — MCP TOOL EXECUTION AUDIT", headingFont));
    document.add(Chunk.NEWLINE);
    addSection4(document, investigation, mcpToolInvocationRepository, normalFont, boldFont);

    // === SECTION 5: HITL Decision + SHA-256 Audit Chain Seal ===
    document.add(
        new Paragraph("SECTION 5 — HITL DECISION + SHA-256 AUDIT CHAIN SEAL", headingFont));
    document.add(Chunk.NEWLINE);
    addSection5(
        document,
        holdId,
        complianceAuditLogRepository,
        hitlApprovalRequestRepository,
        normalFont,
        boldFont);

    document.close();
    return baos.toByteArray();
  }

  private void addSection3(
      Document document, AmlInvestigation investigation, Font normalFont, Font headingFont)
      throws Exception {
    if (investigation != null) {
      document.add(
          new Paragraph("Executive Summary:", new Font(Font.FontFamily.HELVETICA, 10, Font.BOLD)));
      String summary = investigation.getExecutiveSummary();
      if (summary == null || summary.isBlank()) {
        summary = "No executive summary available.";
      }
      document.add(new Paragraph(summary, normalFont));
      document.add(Chunk.NEWLINE);

      String policies = investigation.getCitedPolicyCodes();
      if (policies != null && !policies.isBlank()) {
        document.add(
            new Paragraph(
                "Cited Regulatory Statutes:", new Font(Font.FontFamily.HELVETICA, 10, Font.BOLD)));
        String[] codes = policies.split(",");
        for (String code : codes) {
          document.add(new Paragraph("  • " + code.trim(), normalFont));
        }
      }
    } else {
      document.add(new Paragraph("No AI investigation record found for this hold.", normalFont));
    }
    document.add(Chunk.NEWLINE);
  }

  private void addSection4(
      Document document,
      AmlInvestigation investigation,
      McpToolInvocationRepository mcpToolInvocationRepository,
      Font normalFont,
      Font boldFont)
      throws Exception {

    if (investigation != null) {
      List<McpToolInvocation> invocations =
          mcpToolInvocationRepository.findByInvestigationIdOrderByIdAsc(investigation.getId());

      if (!invocations.isEmpty()) {
        PdfPTable mcpTable = new PdfPTable(5);
        mcpTable.setWidthPercentage(100);
        mcpTable.setWidths(new float[] {2f, 1.5f, 1.5f, 2.5f, 2.5f});
        String[] headers = {
          "Tool Name", "Permission Tier", "Execution Status", "Arguments", "Output"
        };
        for (String h : headers) {
          PdfPCell cell = new PdfPCell(new Phrase(h, boldFont));
          cell.setBackgroundColor(new BaseColor(230, 230, 230));
          cell.setPadding(5);
          mcpTable.addCell(cell);
        }
        for (McpToolInvocation inv : invocations) {
          PdfPCell c1 = new PdfPCell(new Phrase(safe(inv.getToolName()), normalFont));
          PdfPCell c2 = new PdfPCell(new Phrase(safe(inv.getPermissionTier()), normalFont));
          PdfPCell c3 = new PdfPCell(new Phrase(safe(inv.getExecutionStatus()), normalFont));
          PdfPCell c4 = new PdfPCell(new Phrase(truncate(inv.getArgumentsJson(), 80), normalFont));
          PdfPCell c5 = new PdfPCell(new Phrase(truncate(inv.getOutputJson(), 80), normalFont));
          c1.setPadding(4);
          c2.setPadding(4);
          c3.setPadding(4);
          c4.setPadding(4);
          c5.setPadding(4);
          mcpTable.addCell(c1);
          mcpTable.addCell(c2);
          mcpTable.addCell(c3);
          mcpTable.addCell(c4);
          mcpTable.addCell(c5);
        }
        document.add(mcpTable);
      } else {
        document.add(new Paragraph("No MCP tool invocations recorded.", normalFont));
      }
    } else {
      document.add(new Paragraph("No investigation found for MCP audit.", normalFont));
    }
    document.add(Chunk.NEWLINE);
  }

  private void addSection5(
      Document document,
      Long holdId,
      ComplianceAuditLogRepository complianceAuditLogRepository,
      HitlApprovalRequestRepository hitlApprovalRequestRepository,
      Font normalFont,
      Font boldFont)
      throws Exception {

    // HITL Decision
    Optional<AmlInvestigation> invOpt = amlInvestigationRepository.findByBalanceHoldId(holdId);
    if (invOpt.isPresent()) {
      AmlInvestigation inv = invOpt.get();
      Optional<HitlApprovalRequest> hitlOpt =
          hitlApprovalRequestRepository.findByInvestigationId(inv.getId());

      if (hitlOpt.isPresent()) {
        HitlApprovalRequest hitl = hitlOpt.get();
        document.add(
            new Paragraph(
                "HITL Review Decision:", new Font(Font.FontFamily.HELVETICA, 10, Font.BOLD)));
        PdfPTable hitlTable = new PdfPTable(2);
        hitlTable.setWidthPercentage(100);
        hitlTable.setWidths(new float[] {1.2f, 2.8f});
        addTableRow(
            hitlTable, "Reviewer Username", safe(hitl.getReviewerUserName()), boldFont, normalFont);
        addTableRow(hitlTable, "Decision", safe(hitl.getStatus()), boldFont, normalFont);
        addTableRow(
            hitlTable, "Reviewer Notes", safe(hitl.getReviewerNotes()), boldFont, normalFont);
        addTableRow(
            hitlTable,
            "Resolved At",
            hitl.getResolvedAt() != null ? hitl.getResolvedAt().format(DTF) : "Pending",
            boldFont,
            normalFont);
        document.add(hitlTable);
      } else {
        document.add(new Paragraph("HITL approval request pending or not found.", normalFont));
      }
    }

    document.add(Chunk.NEWLINE);
    document.add(
        new Paragraph(
            "SHA-256 Audit Chain — Last 5 Entries:",
            new Font(Font.FontFamily.HELVETICA, 10, Font.BOLD)));

    List<ComplianceAuditLog> allLogs = complianceAuditLogRepository.findAllByOrderByIdAsc();
    int start = Math.max(0, allLogs.size() - 5);
    List<ComplianceAuditLog> last5 = allLogs.subList(start, allLogs.size());

    PdfPTable chainTable = new PdfPTable(4);
    chainTable.setWidthPercentage(100);
    chainTable.setWidths(new float[] {0.8f, 1.8f, 2.4f, 5f});
    String[] chainHeaders = {"ID", "Actor", "Action Type", "SHA-256 Hash"};
    for (String h : chainHeaders) {
      PdfPCell cell = new PdfPCell(new Phrase(h, boldFont));
      cell.setBackgroundColor(new BaseColor(230, 230, 230));
      cell.setPadding(5);
      chainTable.addCell(cell);
    }
    for (ComplianceAuditLog auditLog : last5) {
      PdfPCell c1 = new PdfPCell(new Phrase(String.valueOf(auditLog.getId()), normalFont));
      PdfPCell c2 = new PdfPCell(new Phrase(safe(auditLog.getActorUserName()), normalFont));
      PdfPCell c3 = new PdfPCell(new Phrase(safe(auditLog.getActionType()), normalFont));
      PdfPCell c4 = new PdfPCell(new Phrase(safe(auditLog.getRecordHash()), normalFont));
      c1.setPadding(4);
      c2.setPadding(4);
      c3.setPadding(4);
      c4.setPadding(4);
      chainTable.addCell(c1);
      chainTable.addCell(c2);
      chainTable.addCell(c3);
      chainTable.addCell(c4);
    }
    document.add(chainTable);
    document.add(Chunk.NEWLINE);
  }

  private void addTableRow(
      PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
    PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
    labelCell.setBorder(0);
    labelCell.setPaddingBottom(4);
    table.addCell(labelCell);
    PdfPCell valueCell = new PdfPCell(new Phrase(value != null ? value : "N/A", valueFont));
    valueCell.setBorder(0);
    valueCell.setPaddingBottom(4);
    table.addCell(valueCell);
  }

  private String safe(String val) {
    return val != null ? val : "N/A";
  }

  private String truncate(String val, int maxLen) {
    if (val == null) return "N/A";
    return val.length() > maxLen ? val.substring(0, maxLen) + "..." : val;
  }
}
