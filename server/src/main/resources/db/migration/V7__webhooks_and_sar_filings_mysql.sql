CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(100) NOT NULL,
    target_url VARCHAR(512) NOT NULL,
    signing_secret VARCHAR(128) NOT NULL,
    event_types VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    direction VARCHAR(16) NOT NULL,
    event_id VARCHAR(128) NOT NULL UNIQUE,
    event_type VARCHAR(64) NOT NULL,
    target_or_source VARCHAR(255) NOT NULL,
    signature_header VARCHAR(255) NOT NULL,
    payload_json JSON NOT NULL,
    verification_or_http_status VARCHAR(64) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

INSERT INTO config_treasury_app (config_key, config_value) VALUES
('WEBHOOK_INBOUND_SECRET', 'whsec_runestone_swift_rail_2024_prod')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);
