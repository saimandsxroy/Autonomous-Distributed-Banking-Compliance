package com.runestone.treasury.cache;

import com.runestone.treasury.entity.ConfigTreasuryAppEntity;
import com.runestone.treasury.repository.ConfigTreasuryAppRepository;
import jakarta.annotation.PostConstruct;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class AppCache {

  private static final Logger log = LoggerFactory.getLogger(AppCache.class);

  public enum Keys {
    GEMINI_API_URL,
    GEMINI_MODEL_NAME,
    VELOCITY_MAX_TX_2M,
    HIGH_VALUE_HOLD_THRESHOLD,
    AML_MAX_HOP_DEPTH,
    AML_FAN_OUT_MAX_24H,
    AML_FAN_IN_MAX_24H,
    AML_CIRCULAR_RING_MAX_HOPS,
    GEMINI_EMBEDDING_URL,
    GEMINI_RAG_MODEL
  }

  @Autowired private ConfigTreasuryAppRepository configTreasuryAppRepository;

  private Map<String, String> appCache = new HashMap<>();

  @PostConstruct
  public void init() {
    appCache.clear();
    List<ConfigTreasuryAppEntity> all = configTreasuryAppRepository.findAll();
    for (ConfigTreasuryAppEntity config : all) {
      appCache.put(config.getConfigKey(), config.getConfigValue());
    }
    log.info("AppCache initialized with {} configuration entries from MySQL", appCache.size());
  }

  public String get(String key) {
    return appCache.get(key);
  }
}
