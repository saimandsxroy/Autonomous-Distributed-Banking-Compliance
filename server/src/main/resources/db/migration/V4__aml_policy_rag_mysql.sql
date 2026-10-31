-- Phase 4: AML Policy RAG table and config keys
CREATE TABLE IF NOT EXISTS aml_policy_chunks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    policy_code VARCHAR(64) NOT NULL UNIQUE,
    jurisdiction VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    content TEXT NOT NULL,
    embedding_json JSON,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

-- Seed 6 AML regulatory policy records with 16-dim normalized embedding vectors
-- Dimensions: [circular, layering, round-trip, structuring, smurfing, velocity, burst, high-value, mule, fan-out, fan-in, shell, counterparty, hold, escalation, reporting]
INSERT INTO aml_policy_chunks (policy_code, jurisdiction, title, category, content, embedding_json) VALUES
('FINCEN-31-CFR-1010.314', 'FINCEN', 'Structuring and Smurfing — Anti-Structuring Regulations', 'STRUCTURING_SMURFING',
'FinCEN 31 CFR 1010.314 prohibits the structuring of transactions to evade the Bank Secrecy Act reporting thresholds. Structuring (smurfing) involves breaking up large transactions into multiple smaller ones, typically below $10,000, to avoid mandatory Currency Transaction Report (CTR) filing. Indicators include: multiple cash deposits of $9,000–$9,900 within 24 hours, fan-out patterns where a single originator transfers funds to many recipients in rapid succession, or fan-in aggregation where many sources converge to one account. Financial institutions must file Suspicious Activity Reports (SARs) when structuring is detected, freeze implicated accounts pending investigation, and preserve transaction records for 5 years. Velocity bursts exceeding 4 distinct counterparties within 24 hours are a primary indicator.',
'[0.05, 0.05, 0.05, 0.92, 0.90, 0.30, 0.25, 0.10, 0.25, 0.88, 0.85, 0.05, 0.40, 0.20, 0.10, 0.95]'),

('FATF-REC-16-LAYERING', 'FATF', 'Circular Round-Tripping and Multi-Hop Layering Detection', 'CIRCULAR_LAYERING',
'FATF Recommendation 16 addresses wire transfer layering and circular round-tripping, where illicit funds are moved through a series of accounts to obscure their origin. A circular ring is detected when Account A transfers to B, B to C, and C back to A within a 24-hour window — completing a money-laundering loop. Multi-hop layering can involve 2 to 5 intermediaries before funds return to source. Financial institutions must implement graph-based detection of circular transfer rings up to 5 hops deep, monitoring real-time posting legs. When a circular ring is detected pre-transfer, the transaction must be blocked and placed in PENDING_HOLD with a CIRCULAR_RING_DETECTED risk flag. Correspondent banking relationships and shell counterparties further amplify layering risk.',
'[0.95, 0.95, 0.90, 0.10, 0.10, 0.15, 0.10, 0.05, 0.10, 0.20, 0.20, 0.60, 0.70, 0.50, 0.30, 0.80]'),

('RBI-AML-MULE-04', 'RBI', 'Rapid Fan-Out and Fan-In Mule Account Detection', 'MULE_AGGREGATION',
'RBI AML Circular 04 mandates detection of mule account patterns: accounts that receive funds from many sources (fan-in) and immediately redistribute to many recipients (fan-out) within a short window. A mule aggregator account receiving from 4+ distinct inbound counterparties within 24 hours is a primary indicator. Similarly, a source account sending to 4+ distinct outbound counterparties in 24 hours indicates structuring or smurfing. Transaction monitoring systems must compute fan-out counts (distinct outbound counterparties in 24h) and fan-in counts (distinct inbound counterparties in 24h). Breach of thresholds triggers automatic hold and SAR filing. Accounts exhibiting both high fan-out and high fan-in simultaneously are classified as high-risk mule hubs.',
'[0.10, 0.20, 0.10, 0.50, 0.55, 0.20, 0.20, 0.05, 0.95, 0.90, 0.92, 0.10, 0.40, 0.30, 0.20, 0.75]'),

('TREASURY-VEL-01', 'INTERNAL_TREASURY', 'Sliding-Window Burst Velocity Monitoring', 'VELOCITY_BURST',
'Internal Treasury Policy VEL-01 establishes sliding-window velocity controls to detect burst transfer patterns indicative of automated structuring or account takeover. The policy defines: maximum 3 transactions per 2-minute sliding window per account before velocity hold is triggered. High-value transfers exceeding $10,000 in a single transaction are escalated for compliance review. Velocity monitoring uses Redis atomic Lua scripts to evaluate rate limits without race conditions. When velocity threshold is exceeded, the transfer is placed in PENDING_HOLD with VELOCITY_LIMIT_EXCEEDED risk reason. The system computes distinct counterparty counts over rolling 24-hour windows for smurfing detection. Velocity bursts combined with circular ring patterns indicate sophisticated money-laundering operations.',
'[0.10, 0.10, 0.05, 0.40, 0.35, 0.95, 0.95, 0.50, 0.20, 0.40, 0.30, 0.05, 0.20, 0.60, 0.65, 0.70]'),

('TREASURY-HV-02', 'INTERNAL_TREASURY', 'High-Value Transfer Escalation Policy', 'HIGH_VALUE_HOLD',
'Internal Treasury Policy HV-02 requires automatic compliance escalation for high-value transfers. Any single transfer exceeding the HIGH_VALUE_HOLD_THRESHOLD (default $10,000) triggers a PENDING_HOLD status with HIGH_VALUE_TRANSFER risk reason, pending compliance officer review. High-value transfers in combination with circular ring detection or fan-out structuring patterns represent compounded risk factors warranting immediate regulatory reporting. The compliance officer must review and either approve (releasing the hold) or reject (returning funds) within 24 hours. Repeated high-value transfers to the same counterparty within 7 days require Enhanced Due Diligence. Shell counterparty accounts receiving high-value transfers without clear business purpose are flagged for SAR escalation.',
'[0.10, 0.15, 0.10, 0.20, 0.15, 0.40, 0.30, 0.95, 0.20, 0.20, 0.20, 0.50, 0.55, 0.85, 0.92, 0.80]'),

('FATF-UBO-09', 'FATF', 'Shell Counterparty Cycling and UBO Obfuscation', 'CIRCULAR_LAYERING',
'FATF Guidance UBO-09 addresses Ultimate Beneficial Owner obfuscation through shell counterparty cycling. Complex ownership structures involving shell companies that cycle funds through multiple jurisdictions to obscure the true beneficial owner are a key money-laundering typology. Shell counterparty accounts are identified by: high counterparty turnover (many distinct trading partners with low individual volumes), absence of legitimate business activity, geographic mismatch between registration and transaction locations, and circular fund flows that return to the originating entity. Detection requires 5-hop recursive graph analysis of posting legs to identify multi-entity circular patterns. When a shell counterparty cycle is detected, all implicated accounts must be flagged, beneficial ownership investigations initiated, and correspondent banks notified under FATF Recommendation 13.',
'[0.85, 0.90, 0.80, 0.15, 0.15, 0.10, 0.10, 0.30, 0.20, 0.30, 0.25, 0.95, 0.90, 0.40, 0.50, 0.85]');

-- Insert Phase 4 config keys
INSERT INTO config_treasury_app (config_key, config_value)
VALUES
  ('AML_FAN_OUT_MAX_24H', '4'),
  ('AML_FAN_IN_MAX_24H', '4'),
  ('AML_CIRCULAR_RING_MAX_HOPS', '5'),
  ('GEMINI_EMBEDDING_URL', 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent'),
  ('GEMINI_RAG_MODEL', 'gemini-2.5-flash')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);
