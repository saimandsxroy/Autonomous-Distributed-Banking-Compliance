package com.runestone.treasury.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.runestone.treasury.entity.ComplianceAuditLog;
import com.runestone.treasury.repository.ComplianceAuditLogRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ComplianceAuditLogServiceTests {

  @Mock private ComplianceAuditLogRepository complianceAuditLogRepository;

  @Mock private ObjectMapper objectMapper;

  @InjectMocks private ComplianceAuditLogService complianceAuditLogService;

  @Test
  void testFirstRecordUsesGenesisHash() throws Exception {
    when(objectMapper.writeValueAsString(any())).thenReturn("{\"action\":\"TRANSFER\"}");
    when(complianceAuditLogRepository.findByActorUserNameOrderByCreatedAtDesc("alice"))
        .thenReturn(Collections.emptyList());
    when(complianceAuditLogRepository.save(any(ComplianceAuditLog.class)))
        .thenAnswer(inv -> inv.getArgument(0));

    ComplianceAuditLog result =
        complianceAuditLogService.recordAuditEvent("alice", "TRANSFER_SETTLED", 1L, Map.of());

    assertThat(result.getPreviousHash()).isEqualTo("GENESIS");
    assertThat(result.getRecordHash()).isNotNull().hasSize(64);
  }

  @Test
  void testSubsequentRecordChainsPreviousHash() throws Exception {
    when(objectMapper.writeValueAsString(any())).thenReturn("{\"action\":\"TRANSFER\"}");

    ComplianceAuditLog previous = new ComplianceAuditLog();
    previous.setRecordHash("aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899");
    previous.setCreatedAt(LocalDateTime.now().minusMinutes(1));

    when(complianceAuditLogRepository.findByActorUserNameOrderByCreatedAtDesc("alice"))
        .thenReturn(List.of(previous));
    when(complianceAuditLogRepository.save(any(ComplianceAuditLog.class)))
        .thenAnswer(inv -> inv.getArgument(0));

    ComplianceAuditLog result =
        complianceAuditLogService.recordAuditEvent("alice", "BALANCE_HOLD", 2L, Map.of());

    assertThat(result.getPreviousHash())
        .isEqualTo("aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899");
    assertThat(result.getRecordHash()).isNotNull().hasSize(64);
    // Chain is different from previous record hash
    assertThat(result.getRecordHash())
        .isNotEqualTo("aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899");
  }

  @Test
  void testHashIsConsistentSha256() throws Exception {
    String payloadJson = "{\"action\":\"REPLAY\"}";
    when(objectMapper.writeValueAsString(any())).thenReturn(payloadJson);
    when(complianceAuditLogRepository.findByActorUserNameOrderByCreatedAtDesc("alice"))
        .thenReturn(Collections.emptyList());
    when(complianceAuditLogRepository.save(any(ComplianceAuditLog.class)))
        .thenAnswer(inv -> inv.getArgument(0));

    ComplianceAuditLog result =
        complianceAuditLogService.recordAuditEvent("alice", "DLQ_REPLAY", 5L, Map.of());

    // Verify hash is the expected SHA-256 of the concatenated fields
    String raw = "alice" + "DLQ_REPLAY" + 5L + payloadJson + "GENESIS";
    MessageDigest digest = MessageDigest.getInstance("SHA-256");
    String expectedHash =
        HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));

    assertThat(result.getRecordHash()).isEqualTo(expectedHash);
  }
}
