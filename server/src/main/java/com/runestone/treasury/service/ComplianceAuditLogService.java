package com.runestone.treasury.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.runestone.treasury.entity.ComplianceAuditLog;
import com.runestone.treasury.repository.ComplianceAuditLogRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ComplianceAuditLogService {

  private static final Logger log = LoggerFactory.getLogger(ComplianceAuditLogService.class);

  @Autowired private ComplianceAuditLogRepository complianceAuditLogRepository;

  @Autowired private ObjectMapper objectMapper;

  @Transactional
  public ComplianceAuditLog recordAuditEvent(
      String actorUserName, String actionType, Long targetEntityId, Object payload) {
    try {
      String payloadJson = objectMapper.writeValueAsString(payload);

      // Find previous record hash for chain integrity
      List<ComplianceAuditLog> recent =
          complianceAuditLogRepository.findByActorUserNameOrderByCreatedAtDesc(actorUserName);
      String previousHash = recent.isEmpty() ? "GENESIS" : recent.get(0).getRecordHash();

      // Compute SHA-256 of current record
      String raw = actorUserName + actionType + targetEntityId + payloadJson + previousHash;
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hashBytes = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
      String recordHash = HexFormat.of().formatHex(hashBytes);

      ComplianceAuditLog auditLog = new ComplianceAuditLog();
      auditLog.setActorUserName(actorUserName);
      auditLog.setActionType(actionType);
      auditLog.setTargetEntityId(targetEntityId);
      auditLog.setPayload(payloadJson);
      auditLog.setPreviousHash(previousHash);
      auditLog.setRecordHash(recordHash);
      auditLog.setCreatedAt(LocalDateTime.now());

      ComplianceAuditLog saved = complianceAuditLogRepository.save(auditLog);
      log.info(
          "Audit log recorded: actor={}, action={}, target={}",
          actorUserName,
          actionType,
          targetEntityId);
      return saved;
    } catch (Exception e) {
      log.error("Failed to record compliance audit log: {}", e.getMessage());
      throw new RuntimeException("Audit log failure", e);
    }
  }

  /**
   * Returns all compliance audit logs in chronological order alongside an end-to-end cryptographic
   * verification of the SHA-256 hash chain integrity.
   */
  public Map<String, Object> getAuditLogsWithVerification() {
    List<ComplianceAuditLog> logs = complianceAuditLogRepository.findAllByOrderByIdAsc();
    boolean chainIntact = true;
    Map<String, String> lastHashByActor = new HashMap<>();

    for (ComplianceAuditLog entry : logs) {
      try {
        // 1. Verify previous hash chaining
        String expectedPrev = lastHashByActor.getOrDefault(entry.getActorUserName(), "GENESIS");
        if (!expectedPrev.equalsIgnoreCase(entry.getPreviousHash())) {
          chainIntact = false;
          log.warn(
              "Chain broken at audit log ID {}: expected prevHash {}, found {}",
              entry.getId(),
              expectedPrev,
              entry.getPreviousHash());
          break;
        }

        // 2. Re-compute SHA-256 over raw record fields
        String raw =
            entry.getActorUserName()
                + entry.getActionType()
                + entry.getTargetEntityId()
                + entry.getPayload()
                + entry.getPreviousHash();
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hashBytes = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
        String expectedHash = HexFormat.of().formatHex(hashBytes);

        if (!expectedHash.equalsIgnoreCase(entry.getRecordHash())) {
          chainIntact = false;
          log.warn(
              "Payload hash mismatch at audit log ID {}: expected {}, found {}",
              entry.getId(),
              expectedHash,
              entry.getRecordHash());
          break;
        }

        lastHashByActor.put(entry.getActorUserName(), entry.getRecordHash());
      } catch (Exception e) {
        log.error("Exception verifying audit log ID {}", entry.getId(), e);
        chainIntact = false;
        break;
      }
    }

    Map<String, Object> result = new HashMap<>();
    result.put("chainIntact", chainIntact);
    result.put("auditLogs", logs);
    result.put("totalRecords", logs.size());
    return result;
  }
}
