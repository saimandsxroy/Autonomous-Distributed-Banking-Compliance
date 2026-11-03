package com.runestone.treasury.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.runestone.treasury.cache.AppCache;
import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.entity.WebhookDelivery;
import com.runestone.treasury.repository.TreasuryAccountRepository;
import com.runestone.treasury.repository.WebhookDeliveryRepository;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class WebhookGatewayServiceTests {

  @Mock private WebhookDeliveryRepository webhookDeliveryRepository;

  @Mock private AppCache appCache;

  @Mock private TreasuryAccountRepository treasuryAccountRepository;

  @Mock private ComplianceAuditLogService complianceAuditLogService;

  @InjectMocks private WebhookGatewayService webhookGatewayService;

  private static final String SECRET = "whsec_runestone_swift_rail_2024_prod";

  private String computeHmac(String timestamp, String rawPayload, String secret) throws Exception {
    String dataToSign = timestamp + "." + rawPayload;
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    return HexFormat.of().formatHex(mac.doFinal(dataToSign.getBytes(StandardCharsets.UTF_8)));
  }

  @Test
  void testValidHmacSignatureVerification() throws Exception {
    String timestamp = String.valueOf(Instant.now().getEpochSecond());
    String payload = "{\"event_id\":\"evt-123\",\"amount\":100.00}";
    String signature = computeHmac(timestamp, payload, SECRET);

    boolean valid =
        webhookGatewayService.verifyHmacSignature(timestamp, payload, signature, SECRET);
    assertThat(valid).isTrue();
  }

  @Test
  void testTamperedSignatureRejected() throws Exception {
    String timestamp = String.valueOf(Instant.now().getEpochSecond());
    String payload = "{\"event_id\":\"evt-123\",\"amount\":100.00}";
    String signature = computeHmac(timestamp, payload, SECRET);

    String tamperedPayload = "{\"event_id\":\"evt-123\",\"amount\":999999.00}";
    boolean valid =
        webhookGatewayService.verifyHmacSignature(timestamp, tamperedPayload, signature, SECRET);
    assertThat(valid).isFalse();
  }

  @Test
  void testExpiredTimestampRejected() {
    long expiredTime = Instant.now().getEpochSecond() - 400L;
    String timestamp = String.valueOf(expiredTime);
    String payload = "{\"event_id\":\"evt-123\"}";

    Map<String, Object> result =
        webhookGatewayService.processInboundWebhook(timestamp, "dummy-signature", payload);

    assertThat(result.get("status")).isEqualTo("REJECTED");
    assertThat(result.get("reason").toString()).contains("replay window");
  }

  @Test
  void testDuplicateEventIdDeduplication() throws Exception {
    String timestamp = String.valueOf(Instant.now().getEpochSecond());
    String eventId = "evt-dup-999";
    String payload = "{\"event_id\":\"" + eventId + "\",\"amount\":50.00}";
    String signature = computeHmac(timestamp, payload, SECRET);

    when(appCache.get("WEBHOOK_INBOUND_SECRET")).thenReturn(SECRET);
    WebhookDelivery existingDelivery = new WebhookDelivery();
    existingDelivery.setEventId(eventId);
    when(webhookDeliveryRepository.findByEventId(eventId))
        .thenReturn(Optional.of(existingDelivery));

    Map<String, Object> result =
        webhookGatewayService.processInboundWebhook(timestamp, signature, payload);

    assertThat(result.get("status")).isEqualTo("DUPLICATE");
    assertThat(result.get("eventId")).isEqualTo(eventId);
  }

  @Test
  void testValidInboundWebhookCreditsAccount() throws Exception {
    String timestamp = String.valueOf(Instant.now().getEpochSecond());
    String eventId = UUID.randomUUID().toString();
    String payload =
        "{\"event_id\":\""
            + eventId
            + "\",\"event_type\":\"SWIFT_RAIL_CREDIT\",\"target_account_number\":\"AC-001\",\"amount\":500.00}";
    String signature = computeHmac(timestamp, payload, SECRET);

    when(appCache.get("WEBHOOK_INBOUND_SECRET")).thenReturn(SECRET);
    when(webhookDeliveryRepository.findByEventId(eventId)).thenReturn(Optional.empty());

    TreasuryAccount account = new TreasuryAccount();
    account.setId(10L);
    account.setAccountNumber("AC-001");
    account.setAvailableBalance(new BigDecimal("1000.00"));
    account.setHeldBalance(BigDecimal.ZERO);
    account.setPostedBalance(new BigDecimal("1000.00"));
    when(treasuryAccountRepository.findByAccountNumber("AC-001")).thenReturn(Optional.of(account));

    when(webhookDeliveryRepository.save(any(WebhookDelivery.class)))
        .thenAnswer(
            inv -> {
              WebhookDelivery d = inv.getArgument(0);
              d.setId(1L);
              return d;
            });

    Map<String, Object> result =
        webhookGatewayService.processInboundWebhook(timestamp, signature, payload);

    assertThat(result.get("status")).isEqualTo("ACCEPTED");
    assertThat(result.get("creditStatus").toString()).contains("CREDITED_500.00");
    assertThat(account.getAvailableBalance()).isEqualByComparingTo(new BigDecimal("1500.00"));
    verify(treasuryAccountRepository).save(account);
  }

  @Test
  void testGenerateSignedTestPayload() {
    when(appCache.get("WEBHOOK_INBOUND_SECRET")).thenReturn(SECRET);

    Map<String, Object> validPayload =
        webhookGatewayService.generateSignedTestPayload(false, false);
    assertThat(validPayload.get("payload")).isNotNull();
    assertThat(validPayload.get("timestamp")).isNotNull();
    assertThat(validPayload.get("signature")).isNotNull();

    Map<String, Object> tamperedPayload =
        webhookGatewayService.generateSignedTestPayload(true, false);
    assertThat(tamperedPayload.get("signature").toString()).endsWith("dead");
  }
}
