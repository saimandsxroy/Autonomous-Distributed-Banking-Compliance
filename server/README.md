# RuneStone Enterprise Treasury Backend

Spring Boot 3.4 modular monolithic backend service for RuneStone Enterprise Treasury & Sentinel AML Compliance.

## Core Capabilities
- **Immutable Double-Entry Ledger Engine**: Zero-sum mathematical invariants with 3-bucket balances (`available`, `held`, `posted`).
- **5-Hop Recursive CTE Graph Engine**: Traverses relational counterparty graphs in MySQL 8.0 to detect circular layering loops ($A \to B \to C \to A$).
- **Distributed Idempotency & Velocity Protection**: Redis 7.2 Lua atomic token bucket and sliding window rate limiting.
- **Transactional Outbox & Kafka DLQ**: Guaranteed at-least-once message dispatch with automated Dead-Letter Queue quarantine and 1-click replay.
- **Autonomous Gemini AI Forensic Detective & RAG**: Vector cosine similarity retrieval across FinCEN and FATF statutory regulations with Model Context Protocol (MCP) tool execution.
- **4-Eyes Supervisory Control (HITL)**: FINRA Rule 3110 supervisory approvals and cryptographic SHA-256 tamper-evident audit chaining.
- **Bulk CSV Settlement & 4-Leg Multi-Currency FX**: Virtual thread batch processing with partial-failure isolation and cross-currency settlement.
- **Cryptographic Webhook Gateway & FinCEN SAR PDF**: Constant-time HMAC-SHA256 signature verification and vector-sharp iText PDF regulatory filing generation.
- **Enterprise API Layer**: Typed Request/Response DTOs, Jakarta Bean Validation (`@Valid`), RFC-7807 Global Exception Handling, and Dual-Mode JWT + Basic Auth.

## Quickstart & Testing
```bash
./mvnw clean test          # Run 120 unit, concurrency, and integration tests
./mvnw spring-boot:run     # Start server on http://localhost:8081
```
