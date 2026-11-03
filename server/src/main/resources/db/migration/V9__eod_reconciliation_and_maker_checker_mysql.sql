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
    INDEX idx_recon_discrepancies_run_id (run_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS maker_checker_wires (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    source_account_id BIGINT NOT NULL,
    destination_account_id BIGINT NOT NULL,
    amount DECIMAL(19,4) NOT NULL,
    currency VARCHAR(16) NOT NULL DEFAULT 'USD',
    description VARCHAR(255),
    policy_tier VARCHAR(32) NOT NULL,
    required_approvals INT NOT NULL,
    current_approvals INT NOT NULL DEFAULT 0,
    maker_user_name VARCHAR(100) NOT NULL,
    checker_one_user_name VARCHAR(100),
    checker_two_user_name VARCHAR(100),
    status VARCHAR(32) NOT NULL,
    settled_journal_entry_id BIGINT,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

-- Seed institutional Nostro Suspense Account for automated compensating journal adjustments
INSERT INTO treasury_accounts (user_id, account_number, currency, status, posted_balance, available_balance, held_balance, version)
VALUES (NULL, 'AC-SYS-NOSTRO-USD', 'USD', 'ACTIVE', 10000000.0000, 10000000.0000, 0.0000, 0)
ON DUPLICATE KEY UPDATE account_number = account_number;

