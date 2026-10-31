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
    } catch (Exception e) {
      log.error("HMAC verification error", e);
      return false;
    }
  }

  public Map<String, Object> processInboundWebhook(
      String timestamp, String signature, String rawPayload) {
    Map<String, Object> result = new HashMap<>();

    // 1. Check replay window: parse timestamp (epoch seconds), reject if > 300s old
    if (timestamp == null || signature == null) {
      result.put("status", "REJECTED");
      result.put("reason", "Missing required headers");
      return result;
    }

    long nowEpoch = Instant.now().getEpochSecond();
    long msgEpoch;
    try {
      msgEpoch = Long.parseLong(timestamp.trim());
    } catch (NumberFormatException e) {
      result.put("status", "REJECTED");
      result.put("reason", "Invalid timestamp format");
      return result;
    }

    if (Math.abs(nowEpoch - msgEpoch) > REPLAY_WINDOW_SECONDS) {
      log.warn(
          "Webhook rejected: timestamp too old or too future. msg={}, now={}", msgEpoch, nowEpoch);
      result.put("status", "REJECTED");
      result.put("reason", "Timestamp outside replay window");
      return result;
    }

    // 2. Get secret from appCache
    String secret = appCache.get("WEBHOOK_INBOUND_SECRET");
    if (secret == null || secret.isBlank()) {
      secret = "whsec_runestone_swift_rail_2024_prod";
    }

    // 3. Verify HMAC
    boolean valid = verifyHmacSignature(timestamp, rawPayload, signature, secret);
    if (!valid) {
      log.warn("Webhook HMAC signature verification failed");
      saveDeliveryRecord(
          "INBOUND", null, "UNKNOWN", "SWIFT_RAIL", signature, rawPayload, "SIGNATURE_INVALID");
      result.put("status", "REJECTED");
      result.put("reason", "Signature mismatch");
      return result;
    }

    // 4. Parse payload JSON and extract event_id
    String eventId;
    String eventType;
    String targetAccountNumber;
    BigDecimal amount;

    try {
      JsonNode root = objectMapper.readTree(rawPayload);
      eventId = root.path("event_id").asText(UUID.randomUUID().toString());
      eventType = root.path("event_type").asText("UNKNOWN");
      targetAccountNumber = root.path("target_account_number").asText(null);
      String amtStr = root.path("amount").asText("0");
      amount = new BigDecimal(amtStr);
    } catch (Exception e) {
      log.error("Failed to parse webhook payload JSON", e);
      result.put("status", "REJECTED");
      result.put("reason", "Invalid JSON payload");
      return result;
    }

    // 5. Check deduplication by event_id
    Optional<WebhookDelivery> existing = webhookDeliveryRepository.findByEventId(eventId);
    if (existing.isPresent()) {
      log.warn("Duplicate webhook event_id detected: {}", eventId);
      result.put("status", "DUPLICATE");
      result.put("reason", "Event ID already processed");
      result.put("eventId", eventId);
      return result;
    }

    // 6. Credit target treasury account if payload has target_account_number + amount
    String creditStatus = "NO_ACCOUNT_CREDIT";
    if (targetAccountNumber != null
        && !targetAccountNumber.isBlank()
        && amount.compareTo(BigDecimal.ZERO) > 0) {
      Optional<TreasuryAccount> accountOpt =
          treasuryAccountRepository.findByAccountNumber(targetAccountNumber);
      if (accountOpt.isPresent()) {
        TreasuryAccount account = accountOpt.get();
        account.setAvailableBalance(account.getAvailableBalance().add(amount));
        account.setPostedBalance(account.getAvailableBalance().add(account.getHeldBalance()));
        treasuryAccountRepository.save(account);
        creditStatus =
            "CREDITED_" + amount.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString();
        log.info(
            "Webhook credited {} to account {} ({})", amount, targetAccountNumber, account.getId());
      } else {
        creditStatus = "ACCOUNT_NOT_FOUND";
        log.warn("Webhook target account not found: {}", targetAccountNumber);
      }
    }

    // 7. Save WebhookDelivery record
    WebhookDelivery delivery =
        saveDeliveryRecord(
            "INBOUND", eventId, eventType, "SWIFT_RAIL", signature, rawPayload, "VERIFIED_OK");

    // 8. Record compliance audit log
    try {
      complianceAuditLogService.recordAuditEvent(
          "WEBHOOK_GATEWAY",
          "INBOUND_WEBHOOK_PROCESSED",
          delivery.getId(),
          Map.of(
              "eventId", eventId,
              "eventType", eventType,
              "creditStatus", creditStatus,
              "targetAccount", targetAccountNumber != null ? targetAccountNumber : "N/A"));
    } catch (Exception e) {
      log.warn("Failed to record compliance audit for webhook: {}", e.getMessage());
    }

    result.put("status", "ACCEPTED");
    result.put("eventId", eventId);
    result.put("eventType", eventType);
    result.put("creditStatus", creditStatus);
    result.put("deliveryId", delivery.getId());
    return result;
  }

  public Map<String, Object> generateSignedTestPayload(boolean tamper, boolean expired) {
    String eventId = UUID.randomUUID().toString();
    String eventType = "SWIFT_RAIL_CREDIT";
    String targetAccountNumber = "AC-001";
    double testAmount = 500.00;

    Map<String, Object> payloadMap = new HashMap<>();
    payloadMap.put("event_id", eventId);
    payloadMap.put("event_type", eventType);
    payloadMap.put("target_account_number", targetAccountNumber);
    payloadMap.put("amount", testAmount);

    String rawPayload;
    try {
      rawPayload = objectMapper.writeValueAsString(payloadMap);
    } catch (Exception e) {
      rawPayload =
          "{\"event_id\":\""
              + eventId
              + "\",\"event_type\":\"SWIFT_RAIL_CREDIT\",\"target_account_number\":\"AC-001\",\"amount\":500.00}";
    }

    long epochSeconds;
    if (expired) {
      epochSeconds = Instant.now().getEpochSecond() - 400L; // 400 seconds ago, outside window
    } else {
      epochSeconds = Instant.now().getEpochSecond();
    }
    String timestamp = String.valueOf(epochSeconds);

    String secret = appCache.get("WEBHOOK_INBOUND_SECRET");
    if (secret == null || secret.isBlank()) {
      secret = "whsec_runestone_swift_rail_2024_prod";
    }

    // Compute valid signature
    String dataToSign = timestamp + "." + rawPayload;
    String signature;
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      byte[] computed = mac.doFinal(dataToSign.getBytes(StandardCharsets.UTF_8));
      signature = HexFormat.of().formatHex(computed);
    } catch (Exception e) {
      signature = "error-computing-signature";
    }

    // If tamper=true: return with modified payload but original signature
    String finalPayload = rawPayload;
    if (tamper) {
      finalPayload = rawPayload.replace("500.0", "99999.0");
    }

    Map<String, Object> result = new HashMap<>();
    result.put("payload", finalPayload);
    result.put("timestamp", timestamp);
    result.put("signature", signature);
    result.put("eventId", eventId);
    return result;
  }

  public List<WebhookDelivery> getDeliveries() {
    return webhookDeliveryRepository.findAllByOrderByCreatedAtDesc();
  }

  private WebhookDelivery saveDeliveryRecord(
      String direction,
      String eventId,
      String eventType,
      String targetOrSource,
      String signatureHeader,
      String payloadJson,
      String verificationOrHttpStatus) {
    WebhookDelivery delivery = new WebhookDelivery();
    delivery.setDirection(direction);
    delivery.setEventId(eventId != null ? eventId : UUID.randomUUID().toString());
    delivery.setEventType(eventType);
    delivery.setTargetOrSource(targetOrSource);
    delivery.setSignatureHeader(
        signatureHeader != null
            ? signatureHeader.substring(0, Math.min(signatureHeader.length(), 255))
            : "NONE");
    delivery.setPayloadJson(payloadJson);
    delivery.setVerificationOrHttpStatus(verificationOrHttpStatus);
    return webhookDeliveryRepository.save(delivery);
  }
}
