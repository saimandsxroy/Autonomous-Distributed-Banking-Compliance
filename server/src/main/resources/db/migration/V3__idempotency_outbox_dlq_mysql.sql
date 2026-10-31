CREATE TABLE IF NOT EXISTS idempotency_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    request_hash CHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL,
    http_status INT,
    response_body JSON,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_user_idemp_key (user_name, idempotency_key)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS outbox_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    aggregate_type VARCHAR(64) NOT NULL,
    aggregate_id BIGINT NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    topic VARCHAR(128) NOT NULL,
    payload JSON NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    next_attempt_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    last_error TEXT,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    published_at DATETIME(6),
    INDEX idx_outbox_polling (status, next_attempt_at, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dead_letter_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    outbox_event_id BIGINT,
    original_topic VARCHAR(128) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload JSON NOT NULL,
    failure_reason TEXT NOT NULL,
    replayed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    replayed_at DATETIME(6)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS compliance_audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_user_name VARCHAR(100) NOT NULL,
    action_type VARCHAR(64) NOT NULL,
    target_entity_id BIGINT NOT NULL,
    payload LONGTEXT NOT NULL,
    previous_hash CHAR(64) NOT NULL,
    record_hash CHAR(64) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;
