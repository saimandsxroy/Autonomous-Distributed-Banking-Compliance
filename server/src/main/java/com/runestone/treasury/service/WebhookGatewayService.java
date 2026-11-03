package com.runestone.treasury.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.runestone.treasury.cache.AppCache;
import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.entity.WebhookDelivery;
import com.runestone.treasury.repository.TreasuryAccountRepository;
import com.runestone.treasury.repository.WebhookDeliveryRepository;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class WebhookGatewayService {

  private static final Logger log = LoggerFactory.getLogger(WebhookGatewayService.class);
  private static final long REPLAY_WINDOW_SECONDS = 300L;

  @Autowired private WebhookDeliveryRepository webhookDeliveryRepository;
  @Autowired private AppCache appCache;
  @Autowired private TreasuryAccountRepository treasuryAccountRepository;
  @Autowired private ComplianceAuditLogService complianceAuditLogService;

  private final ObjectMapper objectMapper = new ObjectMapper();

  public boolean verifyHmacSignature(
      String timestamp, String rawPayload, String providedSignature, String secret) {
    try {
      String dataToSign = timestamp + "." + rawPayload;
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      byte[] computed = mac.doFinal(dataToSign.getBytes(StandardCharsets.UTF_8));
      String computedHex = HexFormat.of().formatHex(computed);
      return MessageDigest.isEqual(
          computedHex.getBytes(StandardCharsets.UTF_8),
          providedSignature.getBytes(StandardCharsets.UTF_8));
