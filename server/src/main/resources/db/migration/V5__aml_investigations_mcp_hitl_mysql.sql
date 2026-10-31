-- Phase 5: Autonomous Gemini AML Fraud Detective, MCP Tool Registry, and HITL Engine

CREATE TABLE IF NOT EXISTS aml_investigations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    balance_hold_id BIGINT NOT NULL UNIQUE,
    source_account_id BIGINT NOT NULL,
    destination_account_id BIGINT NOT NULL,
    risk_score INT NOT NULL,
    risk_severity VARCHAR(24) NOT NULL,
    executive_summary TEXT NOT NULL,
    cited_policy_codes VARCHAR(512),
    subgraph_snapshot_json JSON,
    recommended_tool VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'AWAITING_HITL_APPROVAL',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_investigations_hold (balance_hold_id),
    INDEX idx_investigations_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mcp_tool_invocations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    investigation_id BIGINT NOT NULL,
    tool_name VARCHAR(64) NOT NULL,
    permission_tier VARCHAR(16) NOT NULL,
    arguments_json JSON NOT NULL,
    output_json JSON,
    execution_status VARCHAR(24) NOT NULL,
    executed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_mcp_invocations_inv (investigation_id, tool_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS hitl_approval_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    investigation_id BIGINT NOT NULL,
    balance_hold_id BIGINT NOT NULL,
    proposed_tool_name VARCHAR(64) NOT NULL,
    proposed_arguments_json JSON NOT NULL,
    ai_rationale TEXT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING_APPROVAL',
    reviewer_user_name VARCHAR(100),
    reviewer_notes VARCHAR(512),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    resolved_at DATETIME(6),
    INDEX idx_hitl_status (status, created_at),
    INDEX idx_hitl_hold (balance_hold_id)
) ENGINE=InnoDB;

