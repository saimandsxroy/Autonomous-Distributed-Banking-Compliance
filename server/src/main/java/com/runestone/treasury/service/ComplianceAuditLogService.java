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

  private final Map<String, String> lastHashByActor =
      new java.util.concurrent.ConcurrentHashMap<>();

  @Transactional
  public synchronized ComplianceAuditLog recordAuditEvent(
      String actorUserName, String actionType, Long targetEntityId, Object payload) {
    try {
      String payloadJson = objectMapper.writeValueAsString(payload);

      // Find previous record hash from in-memory tracker (or fallback to DB)
      String previousHash = lastHashByActor.get(actorUserName);
      if (previousHash == null) {
        List<ComplianceAuditLog> recent =
            complianceAuditLogRepository.findByActorUserNameOrderByCreatedAtDesc(actorUserName);
        previousHash = recent.isEmpty() ? "GENESIS" : recent.get(0).getRecordHash();
      }

      // Compute SHA-256 of current record
      String raw = actorUserName + actionType + targetEntityId + payloadJson + previousHash;
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hashBytes = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
      String recordHash = HexFormat.of().formatHex(hashBytes);

      // Atomically update memory tracker so concurrent virtual threads see it immediately
      lastHashByActor.put(actorUserName, recordHash);

      ComplianceAuditLog auditLog = new ComplianceAuditLog();
      auditLog.setActorUserName(actorUserName);
      auditLog.setActionType(actionType);
      auditLog.setTargetEntityId(targetEntityId);
      auditLog.setPayload(payloadJson);
      auditLog.setPreviousHash(previousHash);
      auditLog.setRecordHash(recordHash);
