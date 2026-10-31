package com.runestone.treasury.controller;

import com.runestone.treasury.entity.WebhookDelivery;
import com.runestone.treasury.service.WebhookGatewayService;
import jakarta.servlet.http.HttpServletRequest;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/webhooks")
public class WebhookController {

  private static final Logger log = LoggerFactory.getLogger(WebhookController.class);

  @Autowired private WebhookGatewayService webhookGatewayService;

  @PostMapping("/inbound/swift-rail")
  public ResponseEntity<?> inboundWebhook(
      HttpServletRequest request,
      @RequestHeader(value = "X-RuneStone-Timestamp", required = false) String timestamp,
      @RequestHeader(value = "X-RuneStone-Signature", required = false) String signature) {
    try {
      // Read raw bytes from request.getInputStream()
      InputStream inputStream = request.getInputStream();
      byte[] rawBytes = inputStream.readAllBytes();
      String rawPayload = new String(rawBytes, StandardCharsets.UTF_8);

      Map<String, Object> result =
          webhookGatewayService.processInboundWebhook(timestamp, signature, rawPayload);

      String status = (String) result.get("status");
      if ("REJECTED".equals(status)) {
        String reason = (String) result.get("reason");
        if (reason != null
            && (reason.contains("replay")
                || reason.contains("Timestamp")
                || reason.contains("Signature")
                || reason.contains("Missing required headers"))) {
          return ResponseEntity.status(401).body(result);
        }
        return ResponseEntity.status(400).body(result);
      } else if ("DUPLICATE".equals(status)) {
        return ResponseEntity.status(200).body(result);
      }
      return ResponseEntity.ok(result);
    } catch (Exception e) {
      log.error("Error processing inbound webhook", e);
      return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
    }
  }

  @PostMapping("/test-inbound-signed")
  public ResponseEntity<?> testInboundSigned(@RequestBody Map<String, Object> body) {
    boolean tamper = Boolean.TRUE.equals(body.get("tamper"));
    boolean expired = Boolean.TRUE.equals(body.get("expired"));
    return ResponseEntity.ok(webhookGatewayService.generateSignedTestPayload(tamper, expired));
  }

  @GetMapping("/deliveries")
  public ResponseEntity<?> getDeliveries() {
    List<WebhookDelivery> deliveries = webhookGatewayService.getDeliveries();
    return ResponseEntity.ok(deliveries);
  }
}
