package com.runestone.treasury.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.runestone.treasury.cache.AppCache;
import com.runestone.treasury.entity.AmlPolicyChunk;
import com.runestone.treasury.entity.HitlApprovalRequest;
import com.runestone.treasury.entity.McpToolInvocation;
import com.runestone.treasury.repository.HitlApprovalRequestRepository;
import com.runestone.treasury.repository.McpToolInvocationRepository;
import com.runestone.treasury.repository.TreasuryAccountRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AmlMcpToolService {

  private static final Logger log = LoggerFactory.getLogger(AmlMcpToolService.class);

  @Autowired private McpToolInvocationRepository mcpToolInvocationRepository;

  @Autowired private HitlApprovalRequestRepository hitlApprovalRequestRepository;

  @Autowired private AmlGraphDetectionService amlGraphDetectionService;

  @Autowired private AmlPolicyRagService amlPolicyRagService;

  @Autowired private TreasuryAccountRepository treasuryAccountRepository;

  @Autowired private AppCache appCache;

  @Autowired private ObjectMapper objectMapper;

  /** Returns the registered Model Context Protocol (MCP) tool catalog with permission tiers. */
  public List<Map<String, Object>> listAvailableMcpTools() {
    List<Map<String, Object>> tools = new ArrayList<>();

    // Tool 1: inspectTransferSubgraph
    Map<String, Object> t1 = new HashMap<>();
    t1.put("toolName", "inspectTransferSubgraph");
    t1.put("permissionTier", "READ_AUTO");
    t1.put(
        "description",
        "Inspects 5-hop recursive CTE transfer graph around suspect account for circular rings and mule hubs.");
    t1.put("parameters", List.of("sourceAccountId"));
    tools.add(t1);

    // Tool 2: getAccountVelocityProfile
    Map<String, Object> t2 = new HashMap<>();
    t2.put("toolName", "getAccountVelocityProfile");
    t2.put("permissionTier", "READ_AUTO");
    t2.put(
        "description", "Reads account balances, active holds, and 2-minute burst velocity limits.");
    t2.put("parameters", List.of("sourceAccountId"));
    tools.add(t2);

    // Tool 3: searchAmlCompliancePolicies
    Map<String, Object> t3 = new HashMap<>();
    t3.put("toolName", "searchAmlCompliancePolicies");
    t3.put("permissionTier", "READ_AUTO");
    t3.put(
        "description",
        "RAG semantic search retrieving relevant AML regulatory policies (FinCEN, FATF, RBI) for risk reason.");
    t3.put("parameters", List.of("riskReason", "topK"));
    tools.add(t3);

    // Tool 4: proposeReleaseHold
    Map<String, Object> t4 = new HashMap<>();
    t4.put("toolName", "proposeReleaseHold");
    t4.put("permissionTier", "WRITE_HITL");
    t4.put(
        "description",
        "Proposes releasing and settling a balance hold for human compliance officer approval.");
    t4.put("parameters", List.of("investigationId", "holdId", "rationale"));
    tools.add(t4);

    // Tool 5: proposeFreezeAndReverseHold
    Map<String, Object> t5 = new HashMap<>();
    t5.put("toolName", "proposeFreezeAndReverseHold");
    t5.put("permissionTier", "WRITE_HITL");
    t5.put(
        "description",
        "Proposes reversing a balance hold and freezing the source account under AML protocol.");
    t5.put("parameters", List.of("investigationId", "holdId", "freezeAccount", "rationale"));
    tools.add(t5);

    return tools;
  }

  /** Tier 1 READ_AUTO: Inspects the transfer network subgraph. */
  @Transactional
  public Map<String, Object> inspectTransferSubgraph(Long investigationId, Long sourceAccountId) {
    Map<String, Object> subgraph = amlGraphDetectionService.getAccountSubgraph(sourceAccountId);
    recordAutoInvocation(
        investigationId,
        "inspectTransferSubgraph",
        Map.of("sourceAccountId", sourceAccountId),
        subgraph);
    return subgraph;
  }

  /** Tier 1 READ_AUTO: Retrieves velocity metrics, balances, and thresholds. */
  @Transactional
  public Map<String, Object> getAccountVelocityProfile(Long investigationId, Long sourceAccountId) {
    Map<String, Object> profile = new HashMap<>();
    profile.put("sourceAccountId", sourceAccountId);

    treasuryAccountRepository
        .findById(sourceAccountId)
        .ifPresent(
            acc -> {
              profile.put("availableBalance", acc.getAvailableBalance());
              profile.put("heldBalance", acc.getHeldBalance());
              profile.put("postedBalance", acc.getPostedBalance());
              profile.put("accountStatus", acc.getStatus());
              profile.put("currency", acc.getCurrency());
            });

    profile.put(
        "maxVelocity2m",
        appCache.get("VELOCITY_MAX_TX_2M") != null ? appCache.get("VELOCITY_MAX_TX_2M") : "5");
    profile.put(
        "highValueThreshold",
        appCache.get("HIGH_VALUE_HOLD_THRESHOLD") != null
            ? appCache.get("HIGH_VALUE_HOLD_THRESHOLD")
            : "10000.0000");
    profile.put(
        "maxFanOut24h",
        appCache.get("AML_FAN_OUT_MAX_24H") != null ? appCache.get("AML_FAN_OUT_MAX_24H") : "4");

    recordAutoInvocation(
        investigationId,
        "getAccountVelocityProfile",
        Map.of("sourceAccountId", sourceAccountId),
        profile);
    return profile;
  }

  /** Tier 1 READ_AUTO: Semantic RAG search for matching regulatory policies. */
  @Transactional
  public List<AmlPolicyChunk> searchAmlCompliancePolicies(Long investigationId, String riskReason) {
    List<AmlPolicyChunk> policies = amlPolicyRagService.retrieveTopPolicies(riskReason, 3);
    recordAutoInvocation(
        investigationId,
        "searchAmlCompliancePolicies",
        Map.of("riskReason", riskReason, "topK", 3),
        policies);
    return policies;
  }

  /** Tier 2 WRITE_HITL: Proposes releasing the hold for human compliance officer approval. */
  @Transactional
  public HitlApprovalRequest proposeReleaseHold(
      Long investigationId, Long holdId, String rationale) {
    Map<String, Object> args = new HashMap<>();
    args.put("investigationId", investigationId);
    args.put("holdId", holdId);
    args.put("action", "RELEASE_HOLD");
    args.put("rationale", rationale);

    recordQueuedInvocation(investigationId, "proposeReleaseHold", args);

    HitlApprovalRequest request = new HitlApprovalRequest();
    request.setInvestigationId(investigationId);
    request.setBalanceHoldId(holdId);
    request.setProposedToolName("proposeReleaseHold");
    request.setProposedArgumentsJson(toJson(args));
    request.setAiRationale(rationale);
    request.setStatus("PENDING_APPROVAL");
    request.setCreatedAt(LocalDateTime.now());

    HitlApprovalRequest saved = hitlApprovalRequestRepository.save(request);
    log.info(
        "HITL approval request queued: id={}, tool=proposeReleaseHold, holdId={}",
        saved.getId(),
        holdId);
    return saved;
  }

  /** Tier 2 WRITE_HITL: Proposes reversing the hold and freezing the offending account. */
  @Transactional
  public HitlApprovalRequest proposeFreezeAndReverseHold(
      Long investigationId, Long holdId, boolean freezeAccount, String rationale) {
    Map<String, Object> args = new HashMap<>();
    args.put("investigationId", investigationId);
    args.put("holdId", holdId);
    args.put("freezeAccount", freezeAccount);
    args.put("action", "FREEZE_AND_REVERSE");
    args.put("rationale", rationale);

    recordQueuedInvocation(investigationId, "proposeFreezeAndReverseHold", args);

    HitlApprovalRequest request = new HitlApprovalRequest();
    request.setInvestigationId(investigationId);
    request.setBalanceHoldId(holdId);
    request.setProposedToolName("proposeFreezeAndReverseHold");
    request.setProposedArgumentsJson(toJson(args));
    request.setAiRationale(rationale);
    request.setStatus("PENDING_APPROVAL");
    request.setCreatedAt(LocalDateTime.now());

    HitlApprovalRequest saved = hitlApprovalRequestRepository.save(request);
    log.info(
        "HITL approval request queued: id={}, tool=proposeFreezeAndReverseHold, holdId={}",
        saved.getId(),
        holdId);
    return saved;
  }

  private void recordAutoInvocation(
      Long investigationId, String toolName, Object args, Object output) {
    try {
      McpToolInvocation inv = new McpToolInvocation();
      inv.setInvestigationId(investigationId != null ? investigationId : 0L);
      inv.setToolName(toolName);
      inv.setPermissionTier("READ_AUTO");
      inv.setArgumentsJson(toJson(args));
      inv.setOutputJson(toJson(output));
      inv.setExecutionStatus("AUTO_EXECUTED");
      inv.setExecutedAt(LocalDateTime.now());
      mcpToolInvocationRepository.save(inv);
    } catch (Exception e) {
      log.error("Failed to record MCP invocation {}: {}", toolName, e.getMessage());
    }
  }

  private void recordQueuedInvocation(Long investigationId, String toolName, Object args) {
    try {
      McpToolInvocation inv = new McpToolInvocation();
      inv.setInvestigationId(investigationId != null ? investigationId : 0L);
      inv.setToolName(toolName);
      inv.setPermissionTier("WRITE_HITL");
      inv.setArgumentsJson(toJson(args));
      inv.setOutputJson(null);
      inv.setExecutionStatus("QUEUED_FOR_HITL");
      inv.setExecutedAt(LocalDateTime.now());
      mcpToolInvocationRepository.save(inv);
    } catch (Exception e) {
      log.error("Failed to record queued MCP invocation {}: {}", toolName, e.getMessage());
    }
  }

  private String toJson(Object obj) {
    try {
      return objectMapper.writeValueAsString(obj);
    } catch (Exception e) {
      return "{}";
    }
  }
}
