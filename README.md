# RuneStone Enterprise Treasury & Sentinel AML Platform

[![Java 21](https://img.shields.io/badge/Java-21-orange.svg?style=flat-square&logo=openjdk)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.4.0-green.svg?style=flat-square&logo=springboot)](https://spring.io/projects/spring-boot)
[![MySQL](https://img.shields.io/badge/MySQL-8.0_InnoDB-blue.svg?style=flat-square&logo=mysql)](https://www.mysql.com/)
[![Kafka](https://img.shields.io/badge/Apache_Kafka-3.8-black.svg?style=flat-square&logo=apachekafka)](https://kafka.apache.org/)
[![Redis](https://img.shields.io/badge/Redis-7.2_Lua-red.svg?style=flat-square&logo=redis)](https://redis.io/)
[![React](https://img.shields.io/badge/React-19.0_Vite-61DAFB.svg?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=flat-square)](LICENSE)

An enterprise-grade, high-throughput **Corporate Treasury Management & Autonomous Anti-Money Laundering (AML) Compliance Platform**. Engineered to resolve the critical reliability, auditability, and regulatory bottlenecks in institutional B2B banking: mathematical double-entry invariants, distributed idempotency, 5-hop circular transaction graph detection, autonomous Gemini AI forensic investigation with statutory RAG, Model Context Protocol (MCP) tool governance, and cryptographic FinCEN SAR PDF generation.

---

## 1. Real-World Problem Solved

Standard retail banking applications rely on naive balance updates (`UPDATE accounts SET balance = balance - amount`), which are prone to race conditions, phantom reads, and zero audit trails. Furthermore, conventional AML solutions rely on slow, offline batch rules that flag false positives days after illicit funds have already left the banking perimeter.

**RuneStone solves these core financial engineering challenges:**

| Challenge | Real-World Failure Mode | RuneStone Production Architecture |
|---|---|---|
| **Balance Integrity** | Concurrency race conditions cause negative balances or money creation out of thin air. | **Immutable Double-Entry Ledger Engine** with strict zero-sum balancing ($\sum \text{SignedAmount} = 0.0000$) across three distinct balance buckets (`available`, `held`, `posted`). |
| **Duplicate Requests** | Network timeouts cause merchants to re-try transfers, creating duplicate debits. | **Redis + MySQL Distributed Idempotency Filter** with atomic lease locks (`SET NX PX`) and SHA-256 payload checksum validation. |
| **Burst Laundering** | Smurfing / structuring rings fragment illicit money into rapid micro-transfers to bypass thresholds. | **Token Bucket & 2-Minute Sliding Window Velocity Protection** implemented via atomic Redis Lua scripts. |
| **Circular Layering** | Laundering syndicates route funds across multi-hop circular paths ($A \to B \to C \to A$) to obscure origin. | **MySQL 8.0 Recursive Common Table Expression (CTE)** executing up to 5-hop cycle graph traversals in milliseconds. |
| **Dual-Write Inconsistency** | Database commit succeeds but Kafka broker fails, leaving events permanently lost. | **Transactional Outbox Pattern** with guaranteed at-least-once relay and an automated Dead-Letter Queue (DLQ) with 1-click replay. |
| **Regulatory Filing Delays** | Compliance teams spend hours manually drafting FinCEN Suspicious Activity Reports (SAR). | **Autonomous Gemini AI Forensic Detective + Statutory RAG Engine** generating tamper-evident iText FinCEN SAR PDFs with cryptographic SHA-256 hash chaining. |
| **Supervisory Liability** | Rogue employees approve transactions or self-deal on flagged accounts. | **4-Eyes Supervisory Control (FINRA Rule 3110)** enforcing strict separation of duties and Model Context Protocol (`READ_AUTO` vs `WRITE_HITL`) security sandboxes. |

---

## 2. High-Level Architecture & Request Lifecycle

```
[ B2B Merchant / React Client ]
              │
              ▼
   [ Gateway / Spring Security ] ── (Dual-Mode: Bearer JWT + HTTP Basic Auth Fallback)
              │
              ├───► [ Redis Distributed Idempotency & Lua Velocity Gate ]
              │             │ (Atomic lock: 409 Conflict on concurrent payload mismatch)
              │             ▼
              ├───► [ JournalEntryService: 5-Leg Atomic Double-Entry Settlement ]
              │             │ (Pessimistic Write Locks in Ascending Account ID Order)
              │             ▼
              │     [ MySQL 8.0 InnoDB ]
              │     ├── treasury_accounts (available_balance + held_balance = posted_balance)
              │     ├── journal_entries & posting_legs (Zero-Sum Invariant Checked)
              │     └── outbox_events (Atomic DB Commit with Ledger Legs)
              │
              ▼ (Async Background Worker)
   [ OutboxRelayScheduler ] ──► [ Apache Kafka Topic: treasury.transactions.v1 ]
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
          [ TreasuryEventConsumerService ]            [ Dead-Letter Queue (DLQ) ]
                       │                               (Quarantined on 3 retries)
                       ▼
          [ AmlGraphDetectionService ]
          (5-Hop Recursive CTE Graph Traversal)
                       │
                       ▼ (Circular Loop or Velocity Triggered?)
          [ BalanceHoldService: Escrow Quarantine ]
                       │
                       ▼
          [ GeminiAmlDetectiveService + Statutory RAG ]
          ├── Vector Search across FinCEN 31 CFR & FATF Recommendations
          ├── Autonomous MCP Tool Invocations (READ_AUTO safe tools)
          └── Suspicious Activity Synthesis (Dossier + Risk Score 0-100)
                       │
                       ▼
          [ 4-Eyes Supervisory Gate: Human-in-the-Loop (HITL) ]
          ├── Officer Review (FINRA Rule 3110 Separation of Duties)
          ├── 1-Click Official FinCEN SAR PDF Export (iText5)
          └── SHA-256 Tamper-Evident Audit Chain Seal
```

---

## 3. Core Product Engines

### 3.1 Immutable Double-Entry Ledger Engine
Every balance transfer in RuneStone is an atomic journal entry comprised of at least two posting legs (Debit and Credit) adhering to the zero-sum ledger balance invariant:
$$\sum_{i=1}^{n} \text{SignedAmount}_i = 0.0000$$

All balances are represented with `DECIMAL(19, 4)` precision and segregated into **three distinct financial buckets**:
* `available_balance`: Unencumbered liquidity available for immediate withdrawal or transfer.
* `held_balance`: Escrow funds temporarily frozen under compliance investigation or pending batch clearing.
* `posted_balance`: Total legal liabilities of the institution (`posted_balance = available_balance + held_balance`).

To eliminate deadlock risks across high-concurrency transfers, account rows are locked using pessimistic write locks (`PESSIMISTIC_WRITE`) sorted in ascending ID order before updating balances.

### 3.2 5-Hop Recursive CTE Circular Graph Engine
When an account initiates a transaction, RuneStone queries the relational money trail graph using a native MySQL 8.0 Recursive Common Table Expression (CTE). The query dynamically traverses counterparty relationships up to 5 hops deep:

```sql
WITH RECURSIVE money_trail AS (
    SELECT source_account_id, destination_account_id, amount, 1 AS hop_count,
           CONCAT(source_account_id, '->', destination_account_id) AS path
    FROM posting_legs WHERE source_account_id = :originAccountId
    UNION ALL
    SELECT pl.source_account_id, pl.destination_account_id, pl.amount, mt.hop_count + 1,
           CONCAT(mt.path, '->', pl.destination_account_id)
    FROM posting_legs pl
    JOIN money_trail mt ON pl.source_account_id = mt.destination_account_id
    WHERE mt.hop_count < 5 AND LOCATE(CONCAT('->', pl.destination_account_id), mt.path) = 0
)
SELECT * FROM money_trail WHERE destination_account_id = :originAccountId;
```
If a circular loop ($A \to B \to C \to A$) is detected, the transaction is immediately quarantined into `PENDING_HOLD`, isolating funds in escrow without disrupting healthy traffic.

### 3.3 Autonomous Gemini AI Forensic Detective & Statutory RAG
Flagged holds trigger the autonomous AML investigation pipeline:
1. **Regulatory RAG Search**: Computes vector cosine similarity against indexed policy chunks (`FATF-REC-16`, `FINCEN-31-CFR-1010.314`, `RBI-KYC-DIR-2016`, `EU-6AMLD`).
2. **Model Context Protocol (MCP) Tool Invocations**: Safely executes read-only tools (`mcp_fetch_account_balance`, `mcp_fetch_counterparty_metrics`, `mcp_fetch_audit_history`) to gather evidence into an audit log.
3. **Forensic Synthesis**: Generates an executive case narrative with statutory citations, risk score (`0-100`), and recommended supervisory action.

### 3.4 4-Eyes Supervisory Human-in-the-Loop (HITL) Gate
To prevent rogue insider actions and comply with **FINRA Rule 3110**:
* An account owner cannot review or approve an investigation involving their own account.
* High-risk actions require supervisory sign-off (`APPROVE_FREEZE` or `REJECT_DISMISS`).
* Every decision is recorded in an immutable, cryptographically chained `compliance_audit_logs` table where each row contains:
$$\text{RecordHash}_n = \text{SHA-256}(\text{ID} \parallel \text{Actor} \parallel \text{Action} \parallel \text{Payload} \parallel \text{RecordHash}_{n-1})$$

### 3.5 Bulk CSV Settlement & 4-Leg Multi-Currency FX Engine
* **High-Throughput Batch Engine**: Ingests 500+ row corporate payroll CSVs (`POST /batch/upload`), computes SHA-256 file checksums to reject duplicate submissions (`409 Conflict`), and executes settlement across bounded Java 21 Virtual Threads (`Semaphore(20)`) with partial-failure isolation.
* **4-Leg Multi-Currency FX Settlement**: Cross-currency transfers convert funds using pre-seeded exchange rates with a 50 bps spread and debit/credit RuneStone internal system liquidity pools (`AC-SYS-FX-*`) and fee accounts (`AC-SYS-FEE-USD`), ensuring zero-sum balance integrity in both currencies simultaneously.

### 3.6 Cryptographic HMAC-SHA256 Webhook Gateway & Live SSE Telemetry
* **HMAC-SHA256 Webhook Rail**: External rail deposits (`POST /webhooks/inbound/swift-rail`) verify incoming signatures using constant-time `MessageDigest.isEqual()` to prevent timing attacks, reject timestamps exceeding 300 seconds (replay attack protection), and deduplicate incoming events idempotently.
* **FinCEN SAR PDF Dossier Generator**: Endpoint `GET /compliance/investigations/hold/{id}/export-sar-pdf` produces official multi-section Suspicious Activity Reports containing metadata, 5-hop topology paths, Gemini analysis, MCP execution trails, and cryptographic audit seals.
* **Live SSE Telemetry Stream**: Exposes `GET /stream/events` via `CopyOnWriteArrayList<SseEmitter>`, broadcasting real-time ledger settlements, batch progress, and investigation updates directly to the web client.

---

## 4. Verified Tech Stack

| Layer | Technology | Purpose & Protection |
|---|---|---|
| **Runtime & Language** | Java 21 LTS | Virtual Threads (`Loom`) for high-throughput batch execution; Pattern Matching & Records. |
| **Backend Framework** | Spring Boot 3.4.0 | Modular monolithic enterprise architecture, Spring Security, Spring Data JPA, Kafka. |
| **Relational Database** | MySQL 8.0 InnoDB | ACID transactions, `DECIMAL(19,4)` ledger math, Recursive CTE graph engine, row-level locks. |
| **Schema Migrations** | Flyway 10.x | Reproducible, version-controlled database migrations (`V1` through `V8`). |
| **Distributed Cache & Locking** | Redis 7.2 + Atomic Lua | Distributed idempotency locking (`SET NX PX`), sliding window velocity limits, token bucket. |
| **Event Streaming & DLQ** | Apache Kafka 3.8 | Guaranteed at-least-once outbox dispatch, distributed event consumption, and DLQ quarantine. |
| **Generative AI & RAG** | Google Gemini 2.5 Flash | Autonomous forensic detective, structured JSON evidence extraction, statutory policy retrieval. |
| **Regulatory PDF Generation** | iText 5.5.13 | Vector-sharp, 5-section official FinCEN SAR PDF dossier generation. |
| **API Layer Hardening** | Jakarta Validation + JJWT | Typed request/response DTO contracts, RFC-7807 problem details, and dual-mode authentication. |
| **Frontend SPA** | React 19 + Tailwind CSS | Brutalist Dark Noir interface, real-time SSE telemetry banner, SVG graph visualization. |

---

## 5. Enterprise API Layer & Authentication

RuneStone features strict separation between JPA persistence entities and external API contracts, hardened under RFC-7807:

### Dual-Mode Authentication
The security filter chain (`SpringSecurity.java`) supports dual-mode authentication:
1. **JWT Bearer Token**: Issues signed HS256 JWT tokens on `POST /auth/login` containing `sub`, `roles`, and `accountIds` with a 24-hour expiration window.
2. **HTTP Basic Auth Fallback**: Retained in the filter chain so automated tests, curl scripts, and CI/CD pipelines function without friction.

### Standardized RFC-7807 Exception Responses
All uncaught business violations are mapped into standardized error payloads:
```json
{
  "timestamp": "2026-10-31T18:00:00Z",
  "errorCode": "INSUFFICIENT_BALANCE",
  "message": "Available balance 50.00 is less than transfer amount 100.00",
  "traceId": "c8a4f910-410a-40a2-9993-9b8e9742e88a"
}
```
* `400 Bad Request`: Validation errors (`MethodArgumentNotValidException`)
* `403 Forbidden`: Separation of duties violations (`SeparationOfDutiesViolationException`)
* `404 Not Found`: Resource lookups (`ResourceNotFoundException`)
* `409 Conflict`: Idempotency key reuse with different parameters (`IdempotencyConflictException`)
* `422 Unprocessable Entity`: Ledger math violations (`InsufficientBalanceException`)

---

## 6. Project Structure

```
.
├── infra/                                # Production, dev & native container configurations
│   ├── docker-compose.yml                # MySQL 8.0, Redis 7.2, Kafka 3.8, ZooKeeper
│   └── Dockerfile.*                      # Multi-stage container builds
├── server/                               # Spring Boot 3.4.0 Backend Application
│   ├── pom.xml                           # Maven dependencies (JJWT, iTextPDF, Flyway, Kafka, Redis)
│   └── src/
│       ├── main/java/com/runestone/treasury/
│       │   ├── api/                      # External LLM API response contracts
│       │   ├── cache/                    # AppCache in-memory database configuration cache
│       │   ├── config/                   # SpringSecurity, JwtFilter, KafkaConfig, RedisConfig
│       │   ├── controller/               # REST Controllers (Ledger, Compliance, Webhook, SRE, FX)
│       │   ├── dto/                      # Typed Request & Response DTOs (@Valid annotated)
│       │   ├── entity/                   # JPA Entities (Accounts, JournalEntries, Holds, Outbox, SAR)
│       │   ├── exception/                # Typed Exceptions & GlobalTreasuryExceptionHandler
│       │   ├── repository/               # Spring Data Repositories & Custom Criteria Implementations
│       │   ├── scheduler/                # OutboxRelayScheduler (Guaranteed event dispatch)
│       │   └── service/                  # Core Business Engines (Ledger, Graph, RAG, AI, FX, Batch)
│       └── main/resources/
│           ├── db/migration/             # Flyway SQL Migrations (V1 to V8)
│           └── redis/                    # Atomic Lua Scripts for Velocity & Rate Limiting
└── client/                               # React 19 Frontend SPA (Vite + Tailwind CSS)
    ├── src/
    │   ├── api/treasuryApi.js            # Standard ES6 Treasury API client with SSE support
    │   ├── components/                   # Expandable Journal Table, SVG Graph Visualizer, Buckets Card
    │   ├── context/                      # AuthContext for dual-mode JWT/Basic state
    │   ├── pages/                        # Compliance Command Center, Batch & FX, Dashboard, Ledger
    │   └── App.jsx                       # Client-side router configuration
    └── package.json
```

---

## 7. Quickstart & Local Deployment

### Prerequisites
* **Java 21 LTS**
* **Node.js 20+** & npm
* **Docker & Docker Compose**

### Step 1: Start Infrastructure (MySQL, Redis, Kafka, ZooKeeper)
```bash
docker compose -f infra/docker-compose.yml up -d
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```
Ensure your database, Redis, and optional Google Gemini API key are configured:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Step 3: Run Backend Tests & Start Server
```bash
cd server
export JAVA_HOME=/path/to/jdk-21
./mvnw clean test          # Executes all 120 unit, concurrency, and integration tests
./mvnw spring-boot:run     # Starts server on http://localhost:8081
```

### Step 4: Start Frontend Client
```bash
cd client
npm install
npm run dev                # Starts Vite development server on http://localhost:5173
```

---

## 8. Verification & Test Suite

The test suite validates concurrency, ledger balance invariants, rate limiting, and security:

```bash
cd server && ./mvnw test
```

* **120 Tests Run**, **0 Failures**, **0 Errors**:
  * `DoubleEntryConcurrencyTests`: Stress tests concurrent transfers against identical accounts using pessimistic locking without balance corruption.
  * `JournalEntryServiceTests`: Verifies zero-sum posting legs and three-bucket balance updates.
  * `AmlGraphDetectionServiceTests`: Validates circular path detection across multi-hop transactions.
  * `VelocityRiskServiceTests`: Confirms Redis sliding window velocity and burst limits.
  * `WebhookGatewayServiceTests`: Tests constant-time HMAC-SHA256 signature verification and 300s replay rejection.
  * `SarPdfExportServiceTests`: Verifies byte integrity of generated FinCEN SAR PDF filings.
  * `JwtTokenServiceTests`: Validates HS256 claims parsing, expiry, and signature tamper rejection.

---

## 9. License

Distributed under the Apache 2.0 License. See `LICENSE` for details.


