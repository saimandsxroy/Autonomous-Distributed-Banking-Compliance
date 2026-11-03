-- ============================================================================
-- V6: High-Throughput Bulk CSV Settlement Batches & Multi-Currency FX Treasury
-- ============================================================================

-- 1. Extend posting_legs with currency column if not already present
ALTER TABLE posting_legs ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'USD';

-- 2. Create fx_rates table
CREATE TABLE IF NOT EXISTS fx_rates (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    base_currency VARCHAR(3) NOT NULL,
    target_currency VARCHAR(3) NOT NULL,
    exchange_rate DECIMAL(19, 6) NOT NULL,
    spread_bps INT NOT NULL DEFAULT 50,
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_fx_pair (base_currency, target_currency)
) ENGINE=InnoDB;

-- 3. Seed realistic FX rates (spread_bps = 50 -> 0.50% fee)
INSERT INTO fx_rates (base_currency, target_currency, exchange_rate, spread_bps, updated_at) VALUES
('USD', 'EUR', 0.920000, 50, NOW(6)),
('EUR', 'USD', 1.086957, 50, NOW(6)),
('USD', 'GBP', 0.790000, 50, NOW(6)),
('GBP', 'USD', 1.265823, 50, NOW(6)),
('USD', 'INR', 83.500000, 50, NOW(6)),
('INR', 'USD', 0.011976, 50, NOW(6))
ON DUPLICATE KEY UPDATE exchange_rate = VALUES(exchange_rate), spread_bps = VALUES(spread_bps);

-- 4. Seed system liquidity & fee revenue accounts in treasury_accounts ($10,000,000.00 each)
INSERT INTO treasury_accounts (user_id, account_number, currency, status, posted_balance, available_balance, held_balance, version, created_at, updated_at) VALUES
(NULL, 'AC-SYS-FX-USD', 'USD', 'ACTIVE', 10000000.0000, 10000000.0000, 0.0000, 0, NOW(6), NOW(6)),
(NULL, 'AC-SYS-FX-EUR', 'EUR', 'ACTIVE', 10000000.0000, 10000000.0000, 0.0000, 0, NOW(6), NOW(6)),
(NULL, 'AC-SYS-FX-INR', 'INR', 'ACTIVE', 10000000.0000, 10000000.0000, 0.0000, 0, NOW(6), NOW(6)),
(NULL, 'AC-SYS-FX-GBP', 'GBP', 'ACTIVE', 10000000.0000, 10000000.0000, 0.0000, 0, NOW(6), NOW(6)),
(NULL, 'AC-SYS-FEE-USD', 'USD', 'ACTIVE', 10000000.0000, 10000000.0000, 0.0000, 0, NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE status = 'ACTIVE';

-- 5. Create settlement_batches table
CREATE TABLE IF NOT EXISTS settlement_batches (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    batch_reference VARCHAR(64) NOT NULL UNIQUE,
    uploaded_by_user VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_sha256_hash VARCHAR(64) NOT NULL UNIQUE,
    source_account_id BIGINT NOT NULL,
    total_rows INT NOT NULL,
    settled_count INT NOT NULL DEFAULT 0,
    held_aml_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    total_settled_amount DECIMAL(19, 4) NOT NULL DEFAULT 0.0000,
    status VARCHAR(32) NOT NULL DEFAULT 'PROCESSING',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    completed_at DATETIME(6),
    CONSTRAINT fk_batch_source FOREIGN KEY (source_account_id) REFERENCES treasury_accounts(id)
) ENGINE=InnoDB;

-- 6. Create settlement_batch_items table
CREATE TABLE IF NOT EXISTS settlement_batch_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    batch_id BIGINT NOT NULL,
    `row_number` INT NOT NULL,
    destination_account_id BIGINT NOT NULL,
    amount DECIMAL(19, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    description VARCHAR(255),
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    outcome_status VARCHAR(32) NOT NULL,
    journal_entry_id BIGINT,
    failure_or_hold_reason VARCHAR(512),
    processed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_batch_item_batch FOREIGN KEY (batch_id) REFERENCES settlement_batches(id) ON DELETE CASCADE,
    CONSTRAINT fk_batch_item_dest FOREIGN KEY (destination_account_id) REFERENCES treasury_accounts(id)
) ENGINE=InnoDB;

CREATE INDEX idx_batch_items_batch_id ON settlement_batch_items(batch_id, `row_number`);

