CREATE TABLE IF NOT EXISTS treasury_accounts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    account_number VARCHAR(34) NOT NULL UNIQUE,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
    posted_balance DECIMAL(19, 4) NOT NULL DEFAULT 0.0000,
    available_balance DECIMAL(19, 4) NOT NULL DEFAULT 0.0000,
    held_balance DECIMAL(19, 4) NOT NULL DEFAULT 0.0000,
    version BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_treasury_account_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT chk_available_non_negative CHECK (available_balance >= 0.0000),
    CONSTRAINT chk_held_non_negative CHECK (held_balance >= 0.0000),
    CONSTRAINT chk_balance_invariant CHECK (posted_balance = available_balance + held_balance)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS journal_entries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    source_account_id BIGINT NOT NULL,
    destination_account_id BIGINT NOT NULL,
    amount DECIMAL(19, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    reference_type VARCHAR(40) NOT NULL DEFAULT 'TRANSFER',
    status VARCHAR(24) NOT NULL DEFAULT 'SETTLED',
    title VARCHAR(255),
    content TEXT,
    date DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_journal_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT chk_journal_amount_positive CHECK (amount > 0.0000)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS posting_legs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    journal_entry_id BIGINT NOT NULL,
    account_id BIGINT NOT NULL,
    counterparty_account_id BIGINT NOT NULL,
    leg_type VARCHAR(10) NOT NULL,
    balance_bucket VARCHAR(16) NOT NULL DEFAULT 'AVAILABLE',
    amount DECIMAL(19, 4) NOT NULL,
    signed_amount DECIMAL(19, 4) NOT NULL,
    running_posted_balance DECIMAL(19, 4) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_leg_journal FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id),
    CONSTRAINT fk_leg_account FOREIGN KEY (account_id) REFERENCES treasury_accounts(id),
    CONSTRAINT fk_leg_counterparty FOREIGN KEY (counterparty_account_id) REFERENCES treasury_accounts(id),
    CONSTRAINT chk_leg_type CHECK (leg_type IN ('DEBIT', 'CREDIT')),
    CONSTRAINT chk_leg_amount_positive CHECK (amount > 0.0000)
) ENGINE=InnoDB;

CREATE INDEX idx_posting_legs_graph_mysql
    ON posting_legs (account_id, counterparty_account_id, leg_type, created_at);

CREATE TABLE IF NOT EXISTS balance_holds (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    source_account_id BIGINT NOT NULL,
    destination_account_id BIGINT NOT NULL,
    amount DECIMAL(19, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING_HOLD',
    risk_reason VARCHAR(255) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    resolved_at DATETIME(6),
    CONSTRAINT fk_hold_source FOREIGN KEY (source_account_id) REFERENCES treasury_accounts(id),
    CONSTRAINT fk_hold_dest FOREIGN KEY (destination_account_id) REFERENCES treasury_accounts(id)
) ENGINE=InnoDB;

