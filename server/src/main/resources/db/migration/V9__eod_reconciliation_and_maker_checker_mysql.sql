CREATE TABLE IF NOT EXISTS reconciliation_runs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    statement_reference VARCHAR(64) NOT NULL UNIQUE,
    total_external_records INT NOT NULL,
    matched_count INT NOT NULL,
    missing_internal_count INT NOT NULL,
    missing_external_count INT NOT NULL,
    amount_mismatch_count INT NOT NULL,
    status VARCHAR(32) NOT NULL,
    executed_by VARCHAR(100) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reconciliation_discrepancies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    run_id BIGINT NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    source_account_id BIGINT,
    destination_account_id BIGINT,
    discrepancy_type VARCHAR(32) NOT NULL,
    external_amount DECIMAL(19,4),
    internal_amount DECIMAL(19,4),
    currency VARCHAR(16) NOT NULL DEFAULT 'USD',
    resolution_status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    compensating_journal_id BIGINT,
    resolved_by VARCHAR(100),
    resolution_notes VARCHAR(512),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
