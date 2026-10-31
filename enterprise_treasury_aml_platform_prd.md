# Product Requirements Document (PRD) & Technical Architecture Blueprint

**Project Name:** RuneStone Treasury & Sentinel AML (Built on `Semilore317/RuneStone-Bank`)  
**Category:** Enterprise FinOps Infrastructure, Double-Entry Ledger & Autonomous AML/Fraud Compliance Platform  
**Target Timeline:** 30–45 Days (Iterative Staff-Level Engineering Build)  
**Base Repository:** `https://github.com/Semilore317/RuneStone-Bank`  
**Target Roles:** Java Backend Engineer, Software Engineer (Backend / Full-Stack), Distributed Systems & AI Engineer  

---

## 1. Executive Summary & Strategic Positioning

### 1.1 Vision
Transform the existing open-source `Semilore317/RuneStone-Bank` monorepo scaffold into an enterprise-grade **B2B Treasury Ledger, Real-Time Anti-Money Laundering (AML) Graph Engine, and Permission-Controlled AI/MCP Compliance Platform** modeled after **Modern Treasury**, **Stripe Radar**, and **Sardine.ai**.

Rather than building a retail consumer banking CRUD app, this system operates as core financial infrastructure:
1. **Immutable Double-Entry Accounting Engine:** Guarantees mathematical conservation of money ($\sum \text{Debits} - \sum \text{Credits} = 0$) across multi-leg transfers, fee splits, and two-phase balance holds (`PENDING_HOLD` $\rightarrow$ `SETTLED` or `REVERSED`) under high concurrency with zero deadlocks.
2. **Sub-Millisecond Edge Defense & Idempotency:** Enforces multi-layer request idempotency (Redis fast-path locks + PostgreSQL SHA-256 payload hash verification) and atomic Redis Lua sliding-window velocity checks.
3. **Guaranteed Asynchronous Event Pipeline:** Solves dual-write consistency using a PostgreSQL Transactional Outbox (`SELECT ... FOR UPDATE SKIP LOCKED`), Apache Kafka non-blocking retry topics, and an operator-replayable Dead-Letter Queue (DLQ).
4. **In-Database Graph Fraud Detection & Regulatory RAG:** Detects 5-hop circular money-laundering rings ($A \rightarrow B \rightarrow C \rightarrow A$) and rapid structuring ("smurfing") using pure **PostgreSQL Recursive CTEs (`WITH RECURSIVE`)** alongside **`pgvector` HNSW semantic search** over FinCEN/FATF/RBI compliance policies.
5. **Governed AI Detective & Model Context Protocol (MCP) Server:** Uses **Spring AI + Google Gemini** to autonomously investigate flagged transfers via read-only MCP tools while strictly gating money-moving actions (`proposeReleaseHold`, `proposeFreezeAndReverse`) behind **Human-in-the-Loop (HITL)** cryptographic approval in a **React + TypeScript + Tailwind CSS** operator command center.

### 1.2 Why This Complements Your Existing Portfolio
* **KuberFashion (Project 1):** Covers B2C e-commerce, product catalogs, checkout flows, and retail recommendations.
* **Link Management (Project 2):** Covers Node.js/Express, multi-stage SEO workflows, and RBAC.
* **RuneStone Treasury & Sentinel AML (Project 3):** Demonstrates hardcore **Java 21 financial systems engineering**, pessimistic/optimistic concurrency proofs, recursive SQL graph queries, Redis Lua scripting, Kafka DLQ resilience, and production-safe **MCP tool governance with Human-in-the-Loop approvals**.

---

## 2. Base Repository Audit (`Semilore317/RuneStone-Bank`)

### 2.1 What Exists Today (Verified Baseline)
* **Monorepo Structure:**
  * `server/`: Java 21 + Spring Boot 3 backend (runs on port `8081`), Gradle build with Spotless code formatting, OpenAPI/Swagger UI, and Spring Boot Actuator (`/actuator/health`). Contains a small (4.5%) Kotlin module for email templating.
  * `client/`: React + TypeScript + Vite + Tailwind CSS frontend (runs on port `5173`).
  * `infra/`: Docker Compose configuration for local infrastructure plus `Dockerfile.prod` for GraalVM native image builds.
* **Security Baseline:** Stateless JWT authentication filter chain and `@PreAuthorize` method-level role and ownership validation.
* **Event Baseline:** Initial Outbox pattern emitting `user.registered`, `transaction.completed`, and `statement.ready` events to Apache Kafka.

### 2.2 What Is Unbuilt in Base Repo (Our Core Engineering Scope)
The original repository explicitly lists the following under its unbuilt *"What's Next?"* section—meaning **we will architect and implement 100% of the deep backend and UI capabilities below**:
1. **Concurrency Hardening:** Deterministic pessimistic lock ordering (`FOR UPDATE`), `@Version` optimistic locking, and two-phase balance holds.
2. **True Double-Entry Journal Separation:** Refactoring naive account mutations into immutable `journal_entries` and `posting_legs` tables with Flyway schema governance.
3. **Validation & Velocity Gateway:** Replacing the proposed Drools XML dependency with an atomic **Redis 7 Lua Sliding-Window Velocity & Rate-Limiting Engine**.
4. **Graph Fraud Ring Detection:** Replacing the heavy external Neo4j requirement with an indexed **PostgreSQL 16 Recursive CTE Graph Engine** capable of detecting 5-hop circular money laundering in milliseconds.
5. **AI Detective & MCP Server:** Replacing the proposed Kotlin/Koog concept with **100% Java 21 + Spring AI + Google Gemini API + `pgvector` HNSW RAG + Model Context Protocol (MCP) Server with HITL Approvals**.
6. **Automated Concurrency & Integration Proofs:** Building a **JUnit 5 + Testcontainers** suite that fires 100 concurrent virtual threads to mathematically prove zero balance drift and zero deadlocks.

---

## 3. Architectural Cleanup & Verified Tech Stack

### 3.1 Key Simplifications (Avoiding Polyglot Bloated Architecture)
To ensure the system runs smoothly on a single developer machine and is 100% defensible in a Staff Engineer interview:
* **Eliminate the 4.5% Kotlin Module:** Convert the email notification utility in `server/` to pure **Java 21** (using Java 21 text blocks, `record` types, and virtual threads).
* **Do NOT Add Neo4j or Drools:** Running Postgres + Neo4j + Kafka + Zookeeper + Debezium + Redis + Drools locally consumes over 10 GB of RAM and introduces unnecessary operational sprawl. Instead, we consolidate graph traversal (`WITH RECURSIVE`), vector search (`pgvector`), relational ACID ledger tables, and transactional outbox into **PostgreSQL 16 (`pgvector/pgvector:pg16`)**, paired with **Redis 7** and **Apache Kafka (KRaft mode — no Zookeeper)**.

### 3.2 Complete Technology Stack Matrix

| Layer | Technology | Role & Justification |
|---|---|---|
| **Backend Language** | **Java 21 (LTS)** | Virtual threads (`spring.threads.virtual.enabled=true`), `record` DTOs, sealed interfaces for state machines, pattern matching. |
| **Backend Framework** | **Spring Boot 3.3+**, Spring Security 6, Spring Data JPA / JDBC | Core modular monolith architecture, JWT + RBAC security, native SQL recursive CTE execution, and declarative transaction management. |
| **Database & Vector Store** | **PostgreSQL 16 (`pgvector/pgvector:pg16`)** + **Flyway** | ACID storage for double-entry ledger, `outbox_events`, 5-hop recursive graph CTEs, and `vector(768)` HNSW index for AML compliance RAG. |
| **Cache & Fast Locks** | **Redis 7** | Atomic Lua scripts for per-merchant token-bucket rate limiting, sliding-window transfer velocity scoring, and fast-path `Idempotency-Key` locks. |
| **Event Streaming** | **Apache Kafka (KRaft)** | Decouples synchronous ledger holds from asynchronous AML graph analysis, Gemini AI investigation, statement generation, and webhook notifications. |
| **AI & Agentic Layer** | **Spring AI**, **Google Gemini API** (`gemini-2.5-flash` & `text-embedding-004`), **MCP** | Structured output fraud investigations (`AmlInvestigationReport`), `pgvector` RAG grounding, and permission-controlled MCP tools with HITL approvals. |
| **Frontend** | **React 18/19**, **TypeScript**, **Tailwind CSS**, **TanStack Query**, **Lucide Icons** | Enterprise FinOps & Compliance Operator Console: Double-Entry Explorer, 5-Hop Fraud Graph Visualizer, MCP Approval Queue, and DLQ Replay UI. |
| **Observability** | **Spring Boot Actuator**, **Micrometer + Prometheus**, **OpenTelemetry**, **Grafana** | Distributed trace correlation (`traceId` across HTTP $\rightarrow$ Outbox $\rightarrow$ Kafka $\rightarrow$ MCP) and custom financial metrics. |
| **Testing & CI/CD** | **JUnit 5**, **Mockito**, **Testcontainers**, **GitHub Actions** | Ephemeral Postgres/Redis/Kafka containers and 100-thread concurrent transfer verification tests. |

---

## 4. Deep-Engineering Pillars & Functional Requirements

---

### Pillar 1: Immutable Double-Entry Ledger & Deadlock-Free Concurrency

#### 1.1 Problem Solved
Standard student projects update balances via `UPDATE accounts SET balance = balance - ?`. Under concurrent requests or partial failures, this causes lost updates, negative balances, deadlocks (when Thread 1 transfers $A \rightarrow B$ while Thread 2 transfers $B \rightarrow A$), and un-auditable balance drift.

#### 1.2 Architectural Design
1. **Double-Entry Accounting Invariant:**
   Every financial movement is recorded as an immutable `JournalEntry` containing two or more `PostingLeg` rows (`DEBIT` and `CREDIT`). Before any transaction commits, the backend enforces:
   $$\sum_{i=1}^{n} \text{Debit}_i - \sum_{j=1}^{m} \text{Credit}_j = 0$$
2. **Deterministic Lock Ordering (Zero Deadlocks):**
   When a transfer touches multiple accounts (e.g., Sender Account, Receiver Account, Platform Fee Account), the service sorts all involved `account_id` UUIDs in lexicographical ascending order before executing `SELECT ... FOR UPDATE`. Because every transaction acquires row locks in the exact same global order, circular wait conditions ($T_1$ waiting on $T_2$ while $T_2$ waits on $T_1$) are mathematically impossible.
3. **Two-Phase Balance Holds for High-Risk Transfers:**
   * `available_balance`: Funds immediately spendable.
   * `posted_balance`: Settled ledger balance.
   * `held_balance`: Funds locked in `PENDING_HOLD` awaiting asynchronous AML/MCP clearance.
   * If the Synchronous Velocity Gateway flags a transfer as elevated risk (e.g., Risk Score $\ge 60$), the transfer does **not** fail or settle immediately. Instead, it creates a `PENDING_HOLD` journal entry moving funds from `available_balance` to `held_balance`, emits a `treasury.aml.flagged` Outbox event, and awaits AI investigation + human approval.
4. **Append-Only Compliance Audit Log (`REQUIRES_NEW`):**
   Every transfer attempt—even if rolled back due to insufficient funds or idempotency conflict—writes an immutable audit record using `@Transactional(propagation = Propagation.REQUIRES_NEW)` with a SHA-256 hash chain (`previous_hash` + `current_payload_hash`) to detect database tampering.

---

### Pillar 2: Multi-Layer Idempotency & Redis Lua Velocity Engine

#### 2.1 Multi-Layer Idempotency Barrier (`Idempotency-Key` Header)
Every mutating endpoint (`POST /api/v1/transfers`, `POST /api/v1/holds/{id}/release`, `POST /api/v1/mcp/approvals/{id}/decide`) requires an `Idempotency-Key` UUID header:
1. **Layer 1 (Redis Fast-Path Lock):**
   Executes `SET idemp:{merchant_id}:{idempotency_key} IN_FLIGHT NX EX 60`. If the key is already `IN_FLIGHT` from a concurrent duplicate request milliseconds apart, immediately return `409 Conflict` with `Retry-After: 5`.
2. **Layer 2 (PostgreSQL Durable State & Payload Fingerprint):**
   Computes the `SHA-256` hash of the normalized request body:
   * If key exists in `idempotency_records` with a **different** `request_hash`, return `422 Unprocessable Entity` (prevents accidental key reuse across different transfers).
   * If key exists with status `COMPLETED` and matching `request_hash`, immediately replay the stored `http_status` and `response_body` JSON without re-executing ledger logic.
   * Otherwise, insert `STARTED`, execute the ledger transaction, and atomically update the record to `COMPLETED` in the same PostgreSQL commit.

#### 2.2 Redis Atomic Lua Sliding-Window Velocity & Rate Limiter
Executed in a single network round-trip (`EVALSHA`) before acquiring PostgreSQL row locks:
* **API Rate Limiting:** Token-bucket per tenant (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`).
* **Sliding-Window Fraud Velocity Telemetry:**
  * Tracks transfer count and cumulative outgoing volume per account over rolling 2-minute, 1-hour, and 24-hour windows using Redis Sorted Sets (`ZADD`, `ZREMRANGEBYSCORE`, `ZCARD`).
  * Computes an immediate synchronous `velocity_risk_score` ($0\text{--}100$). If `velocity_risk_score` is greater than or equal to $60$, the transfer is routed to `PENDING_HOLD` rather than immediate settlement.

---

### Pillar 3: Transactional Outbox Relay, Kafka Retries & Dead-Letter Queue (DLQ)

#### 3.1 Solving the Dual-Write Problem
Publishing directly to Kafka inside a `@Transactional` database method is unsafe: if the database commits but the Kafka broker times out, downstream systems lose the event; if Kafka succeeds before the database rolls back, phantom events are emitted.

#### 3.2 Outbox Relay & Non-Blocking Retry Architecture
1. **Atomic Outbox Persistence:**
   Every ledger state change inserts a row into `outbox_events` (`status = 'PENDING'`) inside the **same PostgreSQL transaction**.
2. **Concurrent Polling Relay (`SKIP LOCKED`):**
   A scheduled background worker polls every $500\text{ ms}$ using:
   ```sql
   SELECT * FROM outbox_events
   WHERE status = 'PENDING' AND next_attempt_at <= NOW()
   ORDER BY created_at ASC
   LIMIT 50
   FOR UPDATE SKIP LOCKED;
   ```
   This allows multiple backend instances to poll concurrently without locking each other or double-publishing events.
3. **Kafka Topic Topology & Non-Blocking Retries:**
   * Primary Topics:
     * `treasury.transfers.settled`
     * `treasury.aml.flagged`
     * `treasury.statements.requested`
   * Configured with Spring Kafka `@RetryableTopic` ($3$ attempts, exponential backoff: $2\text{s} \rightarrow 10\text{s} \rightarrow 30\text{s}$).
   * Poison-pill or persistently failing events are automatically routed to `.DLT` (Dead-Letter Topic), persisted into `dead_letter_events` in PostgreSQL with full stack trace and payload, and surfaced in the React Operator Console for **1-Click Manual Replay**.

---

### Pillar 4: Graph Money-Laundering Detection (Recursive CTE) & `pgvector` Regulatory RAG

#### 4.1 5-Hop Circular Transfer & Smurfing Detection in Pure PostgreSQL
When a `treasury.aml.flagged` event arrives (or during scheduled sweeps), the AML engine checks for two real-world financial crimes using native PostgreSQL 16 queries:
1. **Circular Layering Ring Detection ($A \rightarrow B \rightarrow C \rightarrow D \rightarrow A$):**
   Uses a cycle-safe **PostgreSQL Recursive CTE (`WITH RECURSIVE`)** over `posting_legs` and `journal_entries` within a configurable time window (e.g., 24 hours, max depth $\le 5$ hops) tracking the `path_ids` UUID array and total retained volume ratio.
2. **Structuring / Smurfing Fan-Out & Fan-In:**
   Detects when a single originator splits funds across $\ge 3$ intermediary mule accounts in amounts just below regulatory reporting thresholds (e.g., $\$8,500\text{--}\$9,999$ against a $\$10,000$ threshold) that subsequently converge into a single beneficiary account.

#### 4.2 `pgvector` HNSW Regulatory & Typology Knowledge Base
* **Vector Schema:** `aml_policy_chunks` table with `embedding vector(768)` indexed via **HNSW (`USING hnsw (embedding vector_cosine_ops)`)**.
* **Seeded Knowledge Corpus:** Pre-loaded via Flyway + startup vectorizer with real-world FinCEN, FATF, and RBI Anti-Money Laundering red-flag indicators (e.g., *FATF Rapid Movement of Funds*, *Structuring Below CTR Thresholds*, *Round-Trip Layering Typologies*, *High-Velocity Dormant Account Awakening*).
* **Grounded Retrieval:** During an investigation, the system embeds the anomaly telemetry using Google Gemini `text-embedding-004` and retrieves the top-$k$ matching regulatory clauses with cosine similarity scores to prevent AI hallucination.

---

### Pillar 5: Spring AI (Gemini) Fraud Detective & Permission-Controlled MCP Server

#### 5.1 Why Model Context Protocol (MCP) + Human-in-the-Loop (HITL)?
In enterprise banking, an LLM must **never** have direct write access to mutate account balances or freeze customer accounts autonomously. We implement a strict **Two-Tier MCP Tool Architecture**:

| MCP Tool Name | Permission Tier | Execution Mode | Purpose |
|---|---|---|---|
| `inspect_transfer_subgraph` | `READ_ONLY` | **Auto-Executed by Gemini** | Runs the 5-hop PostgreSQL Recursive CTE around the flagged account and returns discovered cycles/edges. |
| `get_account_velocity_profile` | `READ_ONLY` | **Auto-Executed by Gemini** | Fetches Redis sliding-window counters, 30-day average transfer size, and account age. |
| `search_aml_regulations` | `READ_ONLY` | **Auto-Executed by Gemini** | Queries the `pgvector` HNSW index for matching FinCEN/FATF compliance rules. |
| `verify_audit_hash_chain` | `READ_ONLY` | **Auto-Executed by Gemini** | Verifies cryptographic integrity of the account's recent `audit_logs` entries. |
| `propose_release_balance_hold` | `PRIVILEGED_WRITE` | **Creates `PENDING_APPROVAL` (HITL)** | Proposes releasing a `PENDING_HOLD` and settling funds to the recipient's `posted_balance`. |
| `propose_reverse_and_freeze` | `PRIVILEGED_WRITE` | **Creates `PENDING_APPROVAL` (HITL)** | Proposes reversing the held funds back to the sender and placing the offending account in `FROZEN_AML` state. |

#### 5.2 Structured AI Investigation Output
Using Spring AI's `BeanOutputConverter` with **Google Gemini (`gemini-2.5-flash`)**, every investigation produces a strictly validated Java 21 `record`:
```java
public record AmlInvestigationReport(
    UUID transferId,
    int compositeRiskScore, // 0 - 100
    RiskVerdict verdict, // CLEAR, SUSPICIOUS_STRUCTURING, CIRCULAR_LAYERING_RING, VELOCITY_ANOMALY
    List<String> detectedGraphPaths,
    List<PolicyCitation> citedRegulations,
    String executiveSummary,
    ProposedMcpAction recommendedAction // Tool name + JSON arguments queued for human approval
) {}
```

#### 5.3 Human-in-the-Loop (HITL) Execution Guarantees
* When Gemini invokes a `PRIVILEGED_WRITE` MCP tool, the tool handler intercepts the call, validates the JSON schema, and inserts a row into `mcp_approval_requests` (`status = 'PENDING_APPROVAL'`).
* A human Compliance Officer logs into the React Operator Console, reviews the graph visualization, cited `pgvector` policy clauses, and tool payload, and clicks **Approve & Execute** or **Reject with Override**.
* Clicking **Approve & Execute** invokes the underlying Double-Entry Ledger Service using a deterministic system `Idempotency-Key` (`mcp-exec-{approval_id}`) and logs the human operator's JWT subject ID (`approved_by_user_id`) in the immutable audit trail.

---

### Pillar 6: Full-Stack React Operator Console, Observability & Concurrency Proofs

#### 6.1 React + TypeScript + Tailwind Operator Command Center (`client/`)
We will upgrade the existing `client/` application into a 4-view **Enterprise Treasury & AML Command Center**:
1. **Treasury & Double-Entry Ledger Explorer:**
   * Create multi-leg transfers (with custom or auto-generated `Idempotency-Key` simulator to test live `409`/`422`/replay behavior from the UI).
   * Inspect any transfer's balanced `DEBIT` and `CREDIT` posting legs, balance hold state (`PENDING_HOLD`, `SETTLED`, `REVERSED`), and SHA-256 audit hash chain verification badge.
2. **Interactive 5-Hop Fraud Ring & Smurfing Graph View:**
   * Visualizes the nodes (Accounts) and directed edges (Transfers with timestamps and amounts) returned by the PostgreSQL Recursive CTE, highlighting circular money-laundering paths in red.
   * Includes a **"Simulate Smurfing / Circular Ring Attack"** demo button that seeds a 4-account circular transfer loop so you can demonstrate real-time detection during live interviews.
3. **AI Detective & MCP Human-in-the-Loop Approval Drawer:**
   * Displays the structured `AmlInvestigationReport`, the exact MCP read tools executed by Gemini (with latency and JSON inputs/outputs), the `pgvector` regulatory citations, and the **Approve / Reject** action bar for pending `propose_release_balance_hold` or `propose_reverse_and_freeze` requests.
4. **System Reliability: Outbox, Kafka & DLQ Replay Console:**
   * Live status of `outbox_events` (`PENDING`, `PUBLISHED`, `FAILED`), Redis rate-limiter token buckets, and a **Dead-Letter Queue Table** with a **Replay Event** button.

---

## 5. Complete Database Schema & Flyway Migration Blueprint

All schema changes are strictly governed by Flyway (`spring.jpa.hibernate.ddl-auto=validate`).

### 5.1 `V1__core_double_entry_ledger.sql`
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TABLE ledger_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    account_number VARCHAR(34) NOT NULL UNIQUE,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    account_type VARCHAR(32) NOT NULL, -- ASSET, LIABILITY, REVENUE, EXPENSE, CUSTOMER_WALLET
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, FROZEN_AML, CLOSED
    posted_balance NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    held_balance NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    available_balance NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_balance_consistency CHECK (posted_balance = available_balance + held_balance)
);

CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_id VARCHAR(128) NOT NULL UNIQUE,
    transfer_type VARCHAR(32) NOT NULL, -- STANDARD_TRANSFER, HOLD_RESERVATION, HOLD_SETTLEMENT, HOLD_REVERSAL
    status VARCHAR(32) NOT NULL, -- POSTED, PENDING_HOLD, SETTLED, REVERSED
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    total_amount NUMERIC(19, 4) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE posting_legs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id),
    account_id UUID NOT NULL REFERENCES ledger_accounts(id),
    counterparty_account_id UUID REFERENCES ledger_accounts(id),
    direction VARCHAR(6) NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
    amount NUMERIC(19, 4) NOT NULL CHECK (amount > 0),
    running_balance NUMERIC(19, 4) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posting_legs_graph ON posting_legs (account_id, counterparty_account_id, created_at DESC)
    WHERE direction = 'DEBIT';

CREATE TABLE balance_holds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_account_id UUID NOT NULL REFERENCES ledger_accounts(id),
    destination_account_id UUID NOT NULL REFERENCES ledger_accounts(id),
    reservation_journal_id UUID NOT NULL REFERENCES journal_entries(id),
    resolution_journal_id UUID REFERENCES journal_entries(id),
    amount NUMERIC(19, 4) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_HOLD', -- PENDING_HOLD, SETTLED, REVERSED
    risk_score INT NOT NULL,
    flag_reason VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
```

### 5.2 `V2__idempotency_outbox_and_audit.sql`
```sql
CREATE TABLE idempotency_records (
    actor_id UUID NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    endpoint VARCHAR(128) NOT NULL,
    request_hash CHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL, -- STARTED, COMPLETED, FAILED
    http_status INT,
    response_body JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    PRIMARY KEY (actor_id, idempotency_key)
);

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_type VARCHAR(64) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    topic VARCHAR(128) NOT NULL,
    payload JSONB NOT NULL,
    trace_id VARCHAR(64),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, PUBLISHED, DEAD_LETTER
    retry_count INT NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE INDEX idx_outbox_relay ON outbox_events (status, next_attempt_at ASC)
    WHERE status = 'PENDING';

CREATE TABLE dead_letter_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outbox_event_id UUID REFERENCES outbox_events(id),
    original_topic VARCHAR(128) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    failure_reason TEXT NOT NULL,
    replayed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    replayed_at TIMESTAMPTZ
);

CREATE TABLE compliance_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_id UUID,
    action_type VARCHAR(64) NOT NULL,
    target_entity_type VARCHAR(64) NOT NULL,
    target_entity_id VARCHAR(128) NOT NULL,
    payload JSONB NOT NULL,
    previous_hash CHAR(64) NOT NULL,
    record_hash CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 5.3 `V3__pgvector_aml_rag_and_mcp_hitl.sql`
```sql
CREATE TABLE aml_policy_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    regulation_code VARCHAR(64) NOT NULL, -- e.g., FINCEN-SAR-102, FATF-REC-10, RBI-KYC-2025
    title VARCHAR(255) NOT NULL,
    typology_category VARCHAR(64) NOT NULL, -- CIRCULAR_LAYERING, STRUCTURING, VELOCITY_SPIKE
    content TEXT NOT NULL,
    embedding vector(768) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aml_policy_hnsw ON aml_policy_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE TABLE aml_investigations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    balance_hold_id UUID NOT NULL UNIQUE REFERENCES balance_holds(id),
    composite_risk_score INT NOT NULL,
    verdict VARCHAR(64) NOT NULL,
    detected_graph_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
    cited_regulations JSONB NOT NULL DEFAULT '[]'::jsonb,
    tool_execution_trace JSONB NOT NULL DEFAULT '[]'::jsonb,
    executive_summary TEXT NOT NULL,
    model_used VARCHAR(64) NOT NULL,
    investigation_latency_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE mcp_approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investigation_id UUID NOT NULL REFERENCES aml_investigations(id),
    balance_hold_id UUID NOT NULL REFERENCES balance_holds(id),
    tool_name VARCHAR(64) NOT NULL, -- propose_release_balance_hold, propose_reverse_and_freeze
    tool_arguments JSONB NOT NULL,
    ai_rationale TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_APPROVAL', -- PENDING_APPROVAL, APPROVED_EXECUTED, REJECTED
    decided_by_user_id UUID,
    reviewer_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decided_at TIMESTAMPTZ
);
```

---

## 6. Core PostgreSQL Recursive CTE for 5-Hop Circular Fraud Detection

This exact query powers the `inspect_transfer_subgraph` MCP tool and the React Fraud Graph Visualizer:

```sql
WITH RECURSIVE transfer_ring AS (
    -- Anchor member: outgoing DEBIT transfers from the suspect origin account in the last 24 hours
    SELECT
        pl.account_id AS origin_account_id,
        pl.account_id AS from_account_id,
        pl.counterparty_account_id AS to_account_id,
        pl.amount AS hop_amount,
        pl.amount AS initial_amount,
        1 AS hop_depth,
        ARRAY[pl.account_id, pl.counterparty_account_id] AS account_path,
        ARRAY[pl.journal_entry_id] AS journal_path,
        pl.created_at AS hop_timestamp,
        FALSE AS is_cycle
    FROM posting_legs pl
    WHERE pl.account_id = :suspectAccountId
      AND pl.direction = 'DEBIT'
      AND pl.counterparty_account_id IS NOT NULL
      AND pl.created_at >= NOW() - INTERVAL '24 hours'

    UNION ALL

    -- Recursive member: follow downstream hops chronological in time up to depth 5
    SELECT
        tr.origin_account_id,
        next_leg.account_id AS from_account_id,
        next_leg.counterparty_account_id AS to_account_id,
        next_leg.amount AS hop_amount,
        tr.initial_amount,
        tr.hop_depth + 1 AS hop_depth,
        tr.account_path || next_leg.counterparty_account_id,
        tr.journal_path || next_leg.journal_entry_id,
        next_leg.created_at AS hop_timestamp,
        (next_leg.counterparty_account_id = tr.origin_account_id) AS is_cycle
    FROM transfer_ring tr
    JOIN posting_legs next_leg
      ON next_leg.account_id = tr.to_account_id
     AND next_leg.direction = 'DEBIT'
     AND next_leg.created_at >= tr.hop_timestamp
     AND next_leg.created_at <= NOW()
    WHERE tr.hop_depth < 5
      AND NOT tr.is_cycle
      -- Allow closing the loop back to origin_account_id, but prevent intermediate sub-loops
      AND (
          next_leg.counterparty_account_id = tr.origin_account_id
          OR NOT (next_leg.counterparty_account_id = ANY(tr.account_path))
      )
)
SELECT
    origin_account_id,
    hop_depth,
    initial_amount,
    hop_amount AS final_hop_amount,
    ROUND((hop_amount / NULLIF(initial_amount, 0)) * 100, 2) AS retained_value_pct,
    account_path,
    journal_path,
    is_cycle
FROM transfer_ring
WHERE is_cycle = TRUE OR hop_depth >= 3
ORDER BY is_cycle DESC, hop_depth DESC;
```

---

## 7. REST API & MCP Endpoint Specification

| Method & Path | Headers Required | Description |
|---|---|---|
| `POST /api/v1/transfers` | `Authorization`, `Idempotency-Key` | Executes an atomic double-entry transfer or places funds into `PENDING_HOLD` if velocity/amount risk $\ge 60$. |
| `POST /api/v1/simulations/attack` | `Authorization` | **Demo Endpoint:** Seeds a 4-hop circular money-laundering ring or smurfing burst to trigger live Kafka + Gemini MCP triage. |
| `GET /api/v1/ledger/journals` | `Authorization` | Paginated list of `journal_entries` with nested `DEBIT`/`CREDIT` `posting_legs` and invariant check status. |
| `GET /api/v1/aml/holds` | `Authorization` (`ROLE_COMPLIANCE`) | Lists all `PENDING_HOLD` transfers with their linked `AmlInvestigationReport` and risk scores. |
| `GET /api/v1/aml/graph/{accountId}` | `Authorization` (`ROLE_COMPLIANCE`) | Executes the 5-hop Recursive CTE and returns nodes + directed edges for the React Graph Visualizer. |
| `GET /api/v1/mcp/approvals` | `Authorization` (`ROLE_COMPLIANCE`) | Lists pending Human-in-the-Loop MCP tool executions (`propose_release_balance_hold`, `propose_reverse_and_freeze`). |
| `POST /api/v1/mcp/approvals/{id}/decide` | `Authorization`, `Idempotency-Key` | Approves or rejects a pending MCP write tool, atomically settling or reversing the `balance_hold` and recording the audit hash. |
| `GET /api/v1/ops/dlq` | `Authorization` (`ROLE_ADMIN`) | Lists failed Kafka/Outbox events stored in `dead_letter_events`. |
| `POST /api/v1/ops/dlq/{id}/replay` | `Authorization`, `Idempotency-Key` | Re-queues a dead-letter event back into `outbox_events` (`status = 'PENDING'`). |

---

## 8. 45-Day Execution Roadmap (6 Structured Phases)

### Phase 1 (Days 1–7): Repo Standardization & Immutable Double-Entry Ledger
* **Tasks:**
  1. Clone `Semilore317/RuneStone-Bank` and verify `infra/`, `server/`, and `client/` startup.
  2. Replace the small Kotlin email module in `server/` with pure Java 21 service classes so the backend is 100% Java 21.
  3. Add Flyway (`V1__core_double_entry_ledger.sql` and `V2__idempotency_outbox_and_audit.sql`) and set `spring.jpa.hibernate.ddl-auto=validate`.
  4. Implement `DoubleEntryLedgerService` with sorted UUID `PESSIMISTIC_WRITE` (`SELECT ... FOR UPDATE`) lock acquisition, `@Version` optimistic checks, $\sum \text{Debits} - \sum \text{Credits} = 0$ validation, Two-Phase `BalanceHold` support, and `REQUIRES_NEW` SHA-256 hash-chained audit logging.
* **Deliverable Verification:** Unit + Testcontainers test firing 100 concurrent virtual threads transferring $A \leftrightarrow B$ with zero deadlocks and zero balance discrepancy.

### Phase 2 (Days 8–14): Multi-Layer Idempotency & Redis 7 Lua Velocity Engine
* **Tasks:**
  1. Add Redis 7 to `infra/docker-compose.yml`.
  2. Implement `IdempotencyBarrierFilter` + `IdempotencyService` combining Redis `SET NX EX 60` in-flight locks with PostgreSQL `idempotency_records` SHA-256 request body hashing.
  3. Write and load two atomic Redis Lua scripts (`rate_limit_token_bucket.lua` and `sliding_window_velocity.lua`).
  4. Integrate synchronous velocity scoring into `POST /api/v1/transfers` so burst transfers automatically transition into `PENDING_HOLD`.
* **Deliverable Verification:** Integration tests verifying `409 Conflict` on parallel duplicate requests, `422 Unprocessable Entity` on mutated body with same key, and `200 OK` cached replay on completed key.

### Phase 3 (Days 15–21): Hardened Outbox Worker, Kafka Retries & DLQ Replay
* **Tasks:**
  1. Configure Apache Kafka (KRaft mode) in `infra/docker-compose.yml`.
  2. Implement `OutboxRelayScheduler` polling `outbox_events` via `FOR UPDATE SKIP LOCKED` and publishing with OpenTelemetry `traceId` headers.
  3. Configure `@RetryableTopic` on the AML and Notification Kafka consumers with automatic fallback to `.DLT` and persistence into `dead_letter_events`.
  4. Expose `GET /api/v1/ops/dlq` and `POST /api/v1/ops/dlq/{id}/replay`.
* **Deliverable Verification:** Simulate a consumer failure, observe 3 exponential backoff retries, confirm arrival in `dead_letter_events`, and trigger replay via REST API.

### Phase 4 (Days 22–28): PostgreSQL Recursive CTE Graph Engine & `pgvector` RAG
* **Tasks:**
  1. Upgrade Postgres image in `infra/docker-compose.yml` to `pgvector/pgvector:pg16` and run `V3__pgvector_aml_rag_and_mcp_hitl.sql`.
  2. Implement `AmlGraphRepository` executing the 5-hop `WITH RECURSIVE transfer_ring` query and fan-out/fan-in structuring query.
  3. Seed 15 realistic FinCEN/FATF/RBI AML compliance typology documents and embed them on startup using Spring AI + Google Gemini `text-embedding-004` into `aml_policy_chunks` (HNSW index).
  4. Build `POST /api/v1/simulations/attack` to generate realistic 4-node circular laundering rings and smurfing bursts for instant demonstration.
* **Deliverable Verification:** Run the attack simulator and verify the recursive CTE returns the exact 4-hop cycle path `[A -> B -> C -> D -> A]` in under $15\text{ ms}$.

### Phase 5 (Days 29–36): Spring AI (Gemini) Fraud Detective & MCP HITL Server
* **Tasks:**
  1. Wire Spring AI Google Gemini chat client and register the 4 `READ_ONLY` MCP tools (`inspect_transfer_subgraph`, `get_account_velocity_profile`, `search_aml_regulations`, `verify_audit_hash_chain`) and 2 `PRIVILEGED_WRITE` tools (`propose_release_balance_hold`, `propose_reverse_and_freeze`).
  2. Implement the Kafka consumer for `treasury.aml.flagged` that triggers the Gemini Detective, captures every tool call and latency in `tool_execution_trace`, and outputs a validated `AmlInvestigationReport`.
  3. Implement the HITL interceptor so write tools create `PENDING_APPROVAL` rows in `mcp_approval_requests`, and build `POST /api/v1/mcp/approvals/{id}/decide` to execute the approved ledger settlement or reversal.
* **Deliverable Verification:** End-to-end test where a flagged transfer triggers Gemini, Gemini calls the SQL graph and `pgvector` tools, queues a `propose_reverse_and_freeze` request, and an operator approval reverses the hold and freezes the account.

### Phase 6 (Days 37–45): React Operator Console, Observability & Interview Polish
* **Tasks:**
  1. Build the 4 enterprise views in `client/` (React + TypeScript + Tailwind + TanStack Query): Double-Entry Journal Explorer, Interactive 5-Hop Fraud Graph Visualizer, AI Detective & MCP Approval Drawer, and Outbox/DLQ Replay Monitor.
  2. Configure Micrometer Prometheus metrics (`/actuator/prometheus`) for `ledger_lock_wait_ms`, `idempotency_replays_total`, `aml_holds_created_total`, and `mcp_approvals_pending`.
  3. Finalize GitHub Actions CI pipeline running Testcontainers (`mvn/gradlew test`), capture high-resolution UI screenshots, and complete the architecture README.

---

## 9. Resume Positioning (ATS-Optimized Bullet Points)

Once implemented and verified by your Testcontainers suite, use these 3 bullets on your resume:

* **RuneStone Treasury & Sentinel AML** | *Java 21, Spring Boot 3, React, TypeScript, PostgreSQL (pgvector), Redis, Kafka, Spring AI (Gemini), MCP, Docker*
  * **Engineered an immutable double-entry financial ledger** in Java 21 and PostgreSQL using deterministic UUID lock ordering (`SELECT ... FOR UPDATE`), two-phase balance holds, and SHA-256 request idempotency fences, eliminating deadlocks and balance drift across 100-thread concurrent Testcontainers stress tests.
  * **Architected an event-driven AML & velocity pipeline** combining atomic Redis Lua sliding-window scripts, a `SKIP LOCKED` PostgreSQL transactional outbox to Apache Kafka with Dead-Letter Queue (DLQ) replay, and 5-hop PostgreSQL `WITH RECURSIVE` graph queries to detect circular money-laundering rings in real time.
  * **Built an autonomous fraud investigation agent and MCP server** using Spring AI, Google Gemini, and `pgvector` HNSW regulatory RAG, enforcing Human-in-the-Loop (HITL) RBAC approvals in a React/TypeScript operator console before executing balance reversals or account freezes.