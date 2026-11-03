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
