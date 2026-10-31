# Master Upgrade Blueprint: Phases 7 to 10 (Enterprise Product Engines, DTO/JWT Hardening & Multi-Portal RBAC)

**Project:** RuneStone Enterprise Treasury & Sentinel AML Platform  
**Current Baseline:** Phases 1–6 Complete (95/95 tests passing, MySQL 8.0 Double-Entry Ledger, Redis Lua Velocity & Idempotency, Transactional Outbox + Kafka + DLQ, 5-Hop Recursive CTE Graph Engine, Gemini RAG + MCP HITL Engine, React.js SPA).  
**Objective:** Elevate the application from an architectural tech demo into an undeniable, heavy-duty **B2B Enterprise Software Product** by adding 4 high-throughput financial engines, upgrading the API layer to strict Enterprise DTO/Validation/Error contracts, and isolating the UI into 3 role-specific portals while retaining a dev-only fast switcher for testing.

---

## Strategic Execution Order: Why This Exact Sequence?

You asked how we should sequence the **4 Heavyweight Product Upgrades**, the **Enterprise API Layer Refactor (DTOs, `@Valid`, `@ControllerAdvice`, JWT)**, and the **Role-Wise Multi-Portal Separation**.

Here is the exact architectural order to prevent breaking your working codebase:

1. **Phase 7 First — High-Throughput Bulk CSV Payroll Batch Engine & 4-Leg Multi-Currency FX Treasury:**
   * *Why first:* These two modules expand your core database schema (`V6__batch_payouts_and_fx_treasury_mysql.sql`) and core ledger math while your existing controllers and tests are stable.
2. **Phase 8 Second — Cryptographic Webhook Gateway (`HMAC-SHA256`), Official FinCEN SAR PDF Export (`iTextPDF`) & Live SSE Telemetry Stream:**
   * *Why second:* Completes all 4 heavyweight product engines so every backend service and database table is finalized before we touch API contracts or split the frontend portals.
3. **Phase 9 Third — Enterprise API Layer Hardening (Strict Request/Response DTOs, `@Valid` Bean Validation, `@RestControllerAdvice` RFC-7807 `ProblemDetail`, and Dual JWT + Basic Auth):**
   * *Why third:* Once all 8 backend engines are built, we wrap all controllers in clean DTO contracts and global exception handling in one unified pass—without breaking any existing tests.
4. **Phase 10 Fourth (Final Step) — True Role-Based Multi-Portal Isolation + Toggleable Dev Testing Bar:**
   * *Why last:* Right now, having everything accessible from one profile makes testing Phases 7, 8, and 9 fast and frictionless. In Phase 10, we lock down the React router and Spring Security into **3 distinct role-isolated portals** (`Corporate Treasury Portal`, `AML Compliance Officer Workspace`, and `SRE & Platform Admin Console`) with real JWT login—while keeping a collapsible `?devMode=true` Quick-Switch Floating Bar so you can still demo all 3 roles in 5 seconds during an interview!

---

## Detailed Architecture & Phase-by-Phase Specification

---

## PHASE 7: High-Throughput Bulk CSV Settlement Engine & 4-Leg Multi-Currency FX Treasury

### 7.1 High-Throughput Bulk CSV Payroll & Vendor Payout Engine
* **Real-World Problem Solved:** Corporate treasurers do not type $50 transfers one by one. They upload a **500 to 5,000-row CSV Payroll or Vendor Settlement file** (`batch_payout.csv`) containing domestic and international payouts.
* **How It Works Under the Hood:**
  1. **Multipart CSV Ingestion (`POST /batch/upload`):** Computes a **SHA-256 file checksum** on the raw CSV bytes so uploading the exact same payroll file twice is rejected (`409 Conflict` / idempotent batch replay).
  2. **Header & Row Staging (`settlement_batches` & `settlement_batch_items`):** Parses rows (`row_number`, `source_account_id`, `destination_account_number`, `amount`, `currency`, `payment_rail`, `memo`) and validates format before moving a single cent.
  3. **Java 21 Virtual-Thread Parallel Chunk Execution:** Processes items concurrently across a bounded Virtual Thread semaphore (`Semaphore(20)`) invoking `JournalEntryService`:
     * Clean rows settle immediately (`SETTLED`).
     * Rows with insufficient balance fail gracefully (`FAILED_INSUFFICIENT_FUNDS`) without rolling back the entire 500-row batch (**Partial-Failure Isolation**).
     * Rows triggering the 5-hop Circular CTE or Redis Velocity limit are automatically quarantined into `PENDING_HOLD` (`HELD_FOR_AML_REVIEW`).
  4. **Reconciliation Report:** Generates a downloadable CSV/JSON Batch Reconciliation Summary (`total_rows`, `settled_count`, `held_aml_count`, `failed_count`, `total_volume_settled`).

### 7.2 Multi-Currency FX Treasury & 4-Leg Atomic Double-Entry Settlement
* **Real-World Problem Solved:** Cross-border B2B payouts require converting currencies (e.g., Alice's `USD` account paying a vendor's `INR` or `EUR` account) while collecting a platform treasury wire fee (`0.50%`) without breaking the zero-sum accounting invariant.
* **How It Works Under the Hood:**
  1. **FX Rate Matrix & Liquidity Pools (`fx_rates` & System Liquidity Accounts):** Pre-seeded FX rates (`USD/EUR`, `USD/GBP`, `USD/INR`) cached in `AppCache` with a spread (e.g., `1 USD = 83.5000 INR`) and dedicated internal system accounts (`RUNESTONE_FX_POOL_USD`, `RUNESTONE_FX_POOL_INR`, `RUNESTONE_FEE_REVENUE_USD`).
  2. **6-Leg Cross-Currency + Fee Double-Entry Journal:**
     When Alice sends `$1,000.00 USD` to a Vendor in `INR` (with a `$5.00 USD` wire fee and `$995.00 USD` converted at `83.50` to `83,082.50 INR`):
     * **Source Currency Legs (`USD` Sum = `0.0000`):**
       * Leg 1 (`DEBIT`): Alice Account (`-$1,000.0000 USD`)
       * Leg 2 (`CREDIT`): RuneStone Fee Revenue Account (`+$5.0000 USD`)
       * Leg 3 (`CREDIT`): RuneStone USD FX Liquidity Pool (`+$995.0000 USD`)
     * **Destination Currency Legs (`INR` Sum = `0.0000`):**
       * Leg 4 (`DEBIT`): RuneStone INR FX Liquidity Pool (`-83,082.5000 INR`)
       * Leg 5 (`CREDIT`): Vendor INR Account (`+83,082.5000 INR`)
  3. Every currency bucket inside `posting_legs` independently sums to `0.0000` ($\sum \text{SignedAmount}_{\text{USD}} = 0$ and $\sum \text{SignedAmount}_{\text{INR}} = 0$).

---

## PHASE 8: Cryptographic Webhook Gateway, Official FinCEN SAR PDF Generator & Live SSE Stream

### 8.1 Cryptographic Inbound & Outbound Webhook Gateway (`HMAC-SHA256`)
* **Real-World Problem Solved:** Enterprise treasury systems integrate with external banking rails (SWIFT / FedNow / RazorpayX / Stripe) via cryptographically signed webhooks and push real-time signed webhook notifications to B2B merchant servers.
* **How It Works Under the Hood:**
  1. **Inbound Rail Settlement Webhook (`POST /webhooks/inbound/rail-settlement`):**
     * Reads raw request bytes, verifies header `X-RuneStone-Signature: t=1730390000,v1=<hex_hmac_sha256>` using **constant-time `MessageDigest.isEqual()`**, rejects timestamps older than **300 seconds** (replay attack protection), and deduplicates `event_id` in `webhook_events`.
  2. **Outbound Merchant Webhook Dispatcher (`webhook_subscriptions` & `webhook_deliveries`):**
     * B2B users register a webhook URL and secret (`whsec_...`).
     * When a transfer settles, a batch completes, or an AML hold is resolved, the Kafka consumer signs the JSON payload with `HMAC-SHA256` and dispatches it with delivery logs and status codes visible in the UI.

### 8.2 Official FinCEN SAR (Suspicious Activity Report) PDF Dossier Generator (`iTextPDF`)
* **Real-World Problem Solved:** When a Compliance Officer approves an account freeze on a money-laundering ring, banks must produce an immutable **Regulatory Filing Document (PDF)** for financial intelligence units (FinCEN / FIU-IND).
* **How It Works Under the Hood:**
  * Endpoint `GET /compliance/investigations/hold/{holdId}/export-sar-pdf` uses `itextpdf` (already in `pom.xml`) to dynamically generate a multi-section, official-looking **Suspicious Activity Report PDF**:
    1. **Filing Header & Case Metadata:** Case ID, Timestamp, Filing Institution, Risk Score (`95/100 CRITICAL`), Status.
    2. **Subject & Counterparty Account Table:** Source/Destination accounts, held amount, currency, and current freeze status.
    3. **5-Hop Circular Graph Topology Table:** Exact hop-by-hop money trail discovered by the MySQL 8.0 Recursive CTE.
    4. **AI Detective Narrative & Cited Regulations:** Full Gemini synthesis + matched FinCEN / FATF / RBI statutory text.
    5. **MCP Tool Execution Log & 4-Eyes Supervisory Sign-Off:** Table of all `READ_AUTO` and `WRITE_HITL` tools, Reviewer Username (`sarah_compliance`), Reviewer Notes, and the **Tamper-Evident SHA-256 Audit Chain Hash** printed at the bottom as a cryptographic seal.

### 8.3 Live Server-Sent Events (`SSE`) Real-Time Telemetry Stream
* **Real-World Problem Solved:** Eliminates manual page refreshing by pushing real-time ledger settlements, batch progress updates, velocity blocks, and AI investigation completions directly to the React UI.
* **How It Works Under the Hood:**
  * `SseTelemetryService` manages `CopyOnWriteArrayList<SseEmitter>` connected via `GET /stream/treasury-events` and broadcasts typed JSON events (`TRANSFER_SETTLED`, `BATCH_PROGRESS`, `HOLD_FLAGGED`, `AI_DOSSIER_READY`, `HITL_RESOLVED`) in real time.

---

## PHASE 9: Enterprise API Layer Hardening (DTOs, `@Valid`, `@RestControllerAdvice` & JWT)

### Why We Do This in Phase 9
In Phases 1–6, we followed the `journalApp` convention (direct Entity exposure in `@RequestBody`, manual `if` checks, localized `try-catch`). While great for rapid prototyping, senior backend interviewers look for **strict separation between JPA persistence entities and external API contracts**:
1. **Typed Request & Response DTOs (`dto/request/*`, `dto/response/*`):**
   * Never expose internal database fields (like password hashes or internal JPA lazy collections) directly in controllers.
   * Create clean DTOs (`TransferRequestDto`, `BatchUploadResponseDto`, `AccountSummaryDto`, `InvestigationDossierDto`, `HitlDecisionRequestDto`) with a clean mapper utility.
2. **Declarative Jakarta Bean Validation (`@Valid`, `@NotNull`, `@Positive`, `@Pattern`):**
   * Annotate all request DTOs with `@NotBlank`, `@DecimalMin("0.01")`, `@Size`, and `@Valid` on controller parameters.
3. **Global Exception Handling (`@RestControllerAdvice` returning RFC-7807 `ProblemDetail`):**
   * Create `GlobalTreasuryExceptionHandler` catching `MethodArgumentNotValidException` (`400`), `InsufficientBalanceException` (`422`), `IdempotencyConflictException` (`409` / `422`), `SeparationOfDutiesViolationException` (`403`), and `ResourceNotFoundException` (`404`), returning standardized JSON error bodies with `timestamp`, `errorCode`, `message`, and `traceId`.
4. **Dual-Mode Authentication (`JWT Bearer Token` + `HTTP Basic Auth` Fallback):**
   * Issue signed HS256 JWT tokens on `POST /auth/login` containing `sub`, `roles`, and `accountIds`, while keeping HTTP Basic Auth enabled in the filter chain so all existing `curl` commands and automated tests continue to work without breaking!

---

## PHASE 10: Role-Wise Multi-Portal Architecture (With Dev Testing Quick-Switch Mode)

### Solving the "One Profile vs. Real Role-Isolated Product" Problem
Right now, all pages are visible in one unified view, which makes testing easy but looks like a single-user demo. In Phase 10, we split the React frontend into **3 Role-Isolated Enterprise Portals** based on the logged-in user's role—**PLUS a toggleable "Developer / Interviewer God-Mode Bar"** at the bottom-right corner of the screen:

| Portal Name | Allowed Role | Dedicated Routes & Features |
|---|---|---|
| **1. Corporate Treasury Portal** | `ROLE_TREASURER` / `ROLE_USER` (`alice`, `bob`) | • Multi-Currency Accounts (`USD`, `EUR`, `INR`) & 3-Bucket Balances<br>• Single Idempotent Transfer & 4-Leg Cross-Currency FX Converter<br>• **Bulk CSV Payroll Batch Uploader** & Reconciliation Report<br>• Outbound Webhook Subscription Manager |
| **2. Sentinel AML Compliance Workspace** | `ROLE_COMPLIANCE_OFFICER` (`sarah_compliance`) | • AI Investigation Dossier Queue & Live SSE Alert Feed<br>• Interactive 5-Hop Circular Money-Laundering SVG Graph<br>• MCP Tool Execution Audit & **4-Eyes HITL Approve/Reject Gate**<br>• **1-Click Official FinCEN SAR PDF Download** & RAG Policy Search |
| **3. SRE & Platform Admin Console** | `ROLE_ADMIN` (`admin_sre` / `sarah_compliance`) | • MySQL Transactional Outbox & **Kafka Dead-Letter Queue (DLQ) Replay**<br>• **Tamper-Evident SHA-256 Cryptographic Audit Chain Verifier**<br>• Inbound `HMAC-SHA256` Webhook Simulator & `AppCache` Hot-Reload<br>• Live System Metrics & 1-Click Demo Ring Seeder |

* **How Testing Stays Effortless (`DevQuickSwitchBar.jsx`):**
  * In normal mode, when `alice@runestone.com` logs in, she **only** sees the Corporate Treasury Portal (if she tries to visit `/compliance` or `/sre`, React RoleGuard and Spring Security block her with `403 Forbidden`).
  * However, a sleek collapsible **"🛠️ Interview Demo Persona Switcher"** pill sits in the bottom-right corner. Clicking `Switch to Sarah (Compliance)` or `Switch to Admin (SRE)` swaps the JWT token and teleports you straight into that role's portal in 1 click!

---

## Copy-Paste Antigravity Prompts (Phases 7, 8, 9, and 10)

Run these 4 prompts sequentially in **Antigravity**.

---

### Prompt 7: Bulk CSV Payout Batch Engine & 4-Leg Multi-Currency FX Treasury

```text
@workspace Execute Phase 7: Build the High-Throughput Bulk CSV Settlement Batch Engine and the 4-Leg Multi-Currency FX & Fee Treasury Engine across `server/` and `client/`.

Preserve all 95+ existing passing tests and existing endpoints.

1. FLYWAY MIGRATION (`V6__batch_payouts_and_fx_treasury_mysql.sql`):
   - Create table `fx_rates`:
     - `id BIGINT AUTO_INCREMENT PRIMARY KEY`
     - `base_currency VARCHAR(3) NOT NULL`
     - `target_currency VARCHAR(3) NOT NULL`
     - `exchange_rate DECIMAL(19, 6) NOT NULL`
     - `spread_bps INT NOT NULL DEFAULT 50`
     - `updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`
     - `UNIQUE KEY uk_fx_pair (base_currency, target_currency)`
   - Seed realistic FX rates (`USD->EUR = 0.920000`, `EUR->USD = 1.086957`, `USD->GBP = 0.790000`, `USD->INR = 83.500000`, `INR->USD = 0.011976`).
   - Seed internal system liquidity & fee accounts in `treasury_accounts` (`AC-SYS-FX-USD`, `AC-SYS-FX-EUR`, `AC-SYS-FX-INR`, `AC-SYS-FEE-USD`) funded with `$10,000,000.00` liquidity.
   - Create table `settlement_batches`:
     - `id BIGINT AUTO_INCREMENT PRIMARY KEY`
     - `batch_reference VARCHAR(64) NOT NULL UNIQUE`
     - `uploaded_by_user VARCHAR(100) NOT NULL`
     - `file_name VARCHAR(255) NOT NULL`
     - `file_sha256_hash CHAR(64) NOT NULL UNIQUE`
     - `source_account_id BIGINT NOT NULL`
     - `total_rows INT NOT NULL`
     - `settled_count INT NOT NULL DEFAULT 0`
     - `held_aml_count INT NOT NULL DEFAULT 0`
     - `failed_count INT NOT NULL DEFAULT 0`
     - `total_settled_amount DECIMAL(19, 4) NOT NULL DEFAULT 0.0000`
     - `status VARCHAR(32) NOT NULL DEFAULT 'PROCESSING'` (`PROCESSING`, `COMPLETED`, `COMPLETED_WITH_HOLDS`, `FAILED`)
     - `created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`
     - `completed_at DATETIME(6)`
   - Create table `settlement_batch_items`:
     - `id BIGINT AUTO_INCREMENT PRIMARY KEY`
     - `batch_id BIGINT NOT NULL`
     - `row_number INT NOT NULL`
     - `destination_account_id BIGINT NOT NULL`
     - `amount DECIMAL(19, 4) NOT NULL`
     - `currency VARCHAR(3) NOT NULL DEFAULT 'USD'`
     - `description VARCHAR(255)`
     - `idempotency_key VARCHAR(128) NOT NULL UNIQUE`
     - `outcome_status VARCHAR(32) NOT NULL` (`SETTLED`, `PENDING_HOLD`, `FAILED`)
     - `journal_entry_id BIGINT`
     - `failure_or_hold_reason VARCHAR(512)`
     - `processed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`

2. 4-LEG MULTI-CURRENCY FX & WIRE FEE ENGINE (`service/FxTreasuryService.java` & `JournalEntryService.java`):
   - Expose `GET /fx/rates` and `GET /fx/quote?from=USD&to=INR&amount=1000` returning the live conversion quote, platform fee (`0.50%`), and net converted destination amount.
   - Update `JournalEntryService.saveEntry(...)` so that if `sourceAccount.getCurrency()` differs from `destinationAccount.getCurrency()` (or if a cross-currency transfer is requested):
     - Lock the user's source/destination accounts AND the corresponding `AC-SYS-FX-*` and `AC-SYS-FEE-*` system accounts in ascending ID order.
     - Generate a multi-leg `JournalEntry` containing:
       1. `DEBIT` Source Account (`-totalSourceAmount` in source currency)
       2. `CREDIT` System Fee Account (`+feeAmount` in source currency)
       3. `CREDIT` System Source-Currency FX Pool (`+netPrincipal` in source currency)
       4. `DEBIT` System Target-Currency FX Pool (`-convertedTargetAmount` in target currency)
       5. `CREDIT` Destination Account (`+convertedTargetAmount` in target currency)
     - Verify the per-currency zero-sum invariant ($\sum \text{SignedAmount}_{c} = 0.0000$ for every currency $c$).

3. BULK CSV PAYOUT BATCH SERVICE (`service/SettlementBatchService.java` & `controller/SettlementBatchController.java`):
   - Implement:
     - `POST /batch/upload`: Accepts a JSON or CSV batch payload (`fileName`, `sourceAccountId`, `csvContent` or `items`), computes the SHA-256 hash of the batch content (rejecting duplicate file uploads with `409 CONFLICT`), and processes each row using `JournalEntryService` with partial-failure isolation (if row #4 fails or hits `PENDING_HOLD`, rows #1–#3 and #5+ still process cleanly).
     - `POST /batch/demo/generate-sample-batch`: Generates and executes a realistic 15-row corporate payroll & vendor payout batch containing a mix of clean domestic transfers (`SETTLED`), cross-currency FX payouts, high-value velocity holds (`PENDING_HOLD`), and 1 insufficient-balance rejection (`FAILED`) so the user can test bulk batch processing in one click.
     - `GET /batch` and `GET /batch/id/{batchId}`: Returns batch summaries and row-by-row reconciliation items.

4. REACT FRONTEND (`client/src/`):
   - Add a **"Bulk CSV Payroll & Multi-Currency FX"** workspace/tab (`BatchAndFxPage.jsx` or inside the Treasury views) allowing users to:
     - Preview live FX quotes (`USD <-> EUR / GBP / INR`) and execute a multi-leg cross-currency transfer, then inspect the resulting 5-leg `PostingLeg` breakdown.
     - Upload a CSV payout file (or click **"⚡ Run 15-Row Sample Corporate Payroll Batch"**) and view the live reconciliation progress bar (`Settled`, `Held for AML`, `Failed`) and row-by-row outcomes.

5. VERIFICATION GATE:
   - Write unit tests (`FxTreasuryServiceTests`, `SettlementBatchServiceTests`).
   - Run `./mvnw spotless:check` and `./mvnw test` in `server/`, and `npm run build` in `client/`.
```

---

### Prompt 8: Cryptographic Webhook Gateway (`HMAC-SHA256`), Official FinCEN SAR PDF Generator & Live SSE Stream

```text
@workspace Execute Phase 8: Implement the Cryptographic HMAC-SHA256 Webhook Gateway, the Official FinCEN SAR PDF Dossier Generator (using `itextpdf`), and the Live Server-Sent Events (SSE) Operational Stream.

1. FLYWAY MIGRATION (`V7__webhooks_and_sar_filings_mysql.sql`):
   - Create table `webhook_subscriptions` (`id BIGINT AUTO_INCREMENT PRIMARY KEY`, `user_name VARCHAR(100) NOT NULL`, `target_url VARCHAR(512) NOT NULL`, `signing_secret VARCHAR(128) NOT NULL`, `event_types VARCHAR(255) NOT NULL`, `active BOOLEAN NOT NULL DEFAULT TRUE`, `created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`).
   - Create table `webhook_deliveries` (`id BIGINT AUTO_INCREMENT PRIMARY KEY`, `direction VARCHAR(16) NOT NULL` (`INBOUND`, `OUTBOUND`), `event_id VARCHAR(128) NOT NULL UNIQUE`, `event_type VARCHAR(64) NOT NULL`, `target_or_source VARCHAR(255) NOT NULL`, `signature_header VARCHAR(255) NOT NULL`, `payload_json JSON NOT NULL`, `verification_or_http_status VARCHAR(64) NOT NULL`, `created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`).

2. CRYPTOGRAPHIC WEBHOOK GATEWAY (`service/WebhookGatewayService.java` & `controller/WebhookController.java`):
   - Inbound Webhook (`POST /webhooks/inbound/swift-rail`):
     - Requires headers `X-RuneStone-Timestamp` and `X-RuneStone-Signature`.
     - Rejects requests if timestamp drift exceeds 300 seconds (`401 UNAUTHORIZED` Replay Window Expired).
     - Computes `HMAC-SHA256(timestamp + "." + rawPayload, webhookSecret)` and compares in constant time (`MessageDigest.isEqual`).
     - Deduplicates by `event_id` (`200 OK` if already processed) and credits the target treasury account for external wire deposits, recording a `ComplianceAuditLog`.
   - Outbound Webhook Simulator & Log (`POST /webhooks/test-inbound-signed`, `GET /webhooks/deliveries`):
     - Provides a helper endpoint that constructs a validly signed `HMAC-SHA256` payload (or a tampered payload) so operators can test cryptographic signature verification and replay protection directly from the React UI.

3. OFFICIAL FINCEN SAR PDF DOSSIER GENERATOR (`service/SarPdfExportService.java`):
   - Using `com.itextpdf.text.*` (`itextpdf` in `pom.xml`), implement `generateSarPdf(Long holdId)` exposed at `GET /compliance/investigations/hold/{holdId}/export-sar-pdf` (`produces = "application/pdf"` with header `Content-Disposition: attachment; filename="FinCEN_SAR_Hold_<holdId>.pdf"`).
   - The generated PDF must include:
     - Official Header: `RUNESTONE TREASURY — SUSPICIOUS ACTIVITY REPORT (FINCEN / FATF COMPLIANCE FILING)`.
     - Section 1: Investigation Metadata, Risk Score (`0-100`), Risk Severity, and Hold Escrow Details.
     - Section 2: 5-Hop MySQL Recursive CTE Subgraph Path & Counterparty Velocity Metrics.
     - Section 3: Gemini AI Detective Executive Summary & Cited Regulatory Statutes (`FATF-REC-16`, `FINCEN-31-CFR-1010.314`, etc.).
     - Section 4: Model Context Protocol (MCP) Tool Execution Table (`READ_AUTO` & `WRITE_HITL` audit trail).
     - Section 5: 4-Eyes Supervisory Decision (`reviewerUserName`, `reviewerNotes`, `resolvedAt`) + Cryptographic SHA-256 Audit Chain Seal (`recordHash`).

4. LIVE SERVER-SENT EVENTS (`service/SseTelemetryService.java` & `GET /stream/events`):
   - Broadcast live JSON events whenever a transfer settles, a batch completes, a hold is flagged, or an HITL decision executes.

5. REACT UI UPDATES (`client/src/`):
   - In `ComplianceCommandCenter.jsx`, add a prominent **"📄 Download Official FinCEN SAR Filing (PDF)"** button inside every Investigation Dossier card that downloads the generated PDF.
   - Add a **Webhook Gateway & HMAC-SHA256 Tester** panel in the SRE tab allowing operators to fire a valid signed SWIFT webhook (`200 OK`), a tampered signature (`401 Unauthorized`), or an expired timestamp (`401 Replay Rejected`).
   - Add a live real-time Event Stream ticker in the header.

6. VERIFICATION GATE:
   - Write unit tests (`WebhookGatewayServiceTests`, `SarPdfExportServiceTests` asserting non-empty `%PDF-1.` byte header).
   - Run `./mvnw spotless:check` and `./mvnw test` in `server/`, and `npm run build` in `client/`.
```

---

### Prompt 9: Enterprise API Layer Hardening (Strict DTOs, `@Valid`, `@RestControllerAdvice` & JWT)

```text
@workspace Execute Phase 9: Upgrade the backend API surface to Enterprise DTO Contracts, Jakarta Bean Validation (`@Valid`), Global Exception Handling (`@RestControllerAdvice` returning RFC-7807 `ProblemDetail` / structured error responses), and Dual JWT + HTTP Basic Authentication.

CRITICAL PRESERVATION RULE: Keep backward-compatible field mappings and dual authentication (accepting BOTH `Authorization: Bearer <jwt>` AND `Authorization: Basic <base64>`) so 100% of existing tests and frontend calls continue to work seamlessly.

1. STRUCTURED REQUEST & RESPONSE DTOS (`com.runestone.treasury.dto`):
   - Create validated Request DTOs using `jakarta.validation.constraints.*` (`@NotNull`, `@NotBlank`, `@Positive`, `@DecimalMin`, `@Size`):
     - `TransferRequestDto` (`sourceAccountId`, `destinationAccountId`, `amount`, `currency`, `title`, `content`)
     - `CreateAccountRequestDto` (`currency`, `initialDeposit`)
     - `HitlDecisionRequestDto` (`notes`)
     - `UserRegistrationRequestDto` (`userName`, `email`, `password`)
   - Create clean Response DTOs (`AccountResponseDto`, `JournalEntryResponseDto`, `InvestigationDossierResponseDto`, `ApiErrorResponseDto`) that never leak internal password hashes or circular JPA references.

2. GLOBAL EXCEPTION HANDLER (`com.runestone.treasury.exception.GlobalTreasuryExceptionHandler`):
   - Annotate with `@RestControllerAdvice`.
   - Handle:
     - `MethodArgumentNotValidException` -> `400 BAD_REQUEST` with field-level validation error details.
     - `IllegalArgumentException` -> `400 BAD_REQUEST`.
     - `SecurityException` / Access Denied -> `403 FORBIDDEN`.
     - `IllegalStateException` -> map conflict/tamper/insufficient balance states cleanly to `409 CONFLICT` or `422 UNPROCESSABLE_ENTITY`.
   - Include `timestamp`, `status`, `error`, `message`, and `path` in every error response.

3. JWT + BASIC AUTH DUAL FILTER (`SpringSecurity.java`):
   - Expose `POST /auth/login` returning a signed JWT token (`accessToken`, `username`, `email`, `roles`, `portalRedirect`) while keeping HTTP Basic Auth active for CLI/cURL and legacy test compatibility.

4. VERIFICATION GATE:
   - Run `./mvnw spotless:check` and `./mvnw test` in `server/` and ensure 100% of unit and concurrency tests pass.
```

---

### Prompt 10: Role-Wise Multi-Portal Separation + Toggleable Dev Testing Switcher (`client/`)

```text
@workspace Execute Phase 10: Transform the React.js (`.jsx`) frontend into a Role-Isolated Multi-Portal Enterprise Application with 3 dedicated role workspaces, while retaining a toggleable "Developer / Interview Testing Quick-Switch Bar" for effortless single-click role switching during demos.

1. THREE ROLE-SPECIFIC PORTALS IN REACT (`client/src/`):
   - **Portal 1: Corporate Treasurer Workspace (`/dashboard`, `/transfer`, `/batch-fx`, `/transactions`)**
     - Accessible to `ROLE_USER` / `ROLE_TREASURER` (`alice@runestone.com`, `bob@runestone.com`).
     - Features: 3-Bucket Account Balances, Single Idempotent Transfer, 4-Leg Multi-Currency FX Converter, Bulk CSV Payroll Uploader, and Expandable Double-Entry Posting Legs.
     - Hide internal SRE and Compliance Officer approval queues from the primary sidebar when logged in as a regular customer (`alice`), or show a lock icon indicating `Requires ROLE_COMPLIANCE_OFFICER`.
   - **Portal 2: Sentinel AML Compliance Officer Workspace (`/compliance`)**
     - Accessible to `ROLE_COMPLIANCE_OFFICER` (`sarah@runestone.com`).
     - Features: Flagged Balance Hold Queue, Interactive 5-Hop MySQL Recursive CTE Graph Visualizer, Gemini AI Dossier, MCP Tool Execution Trail (`READ_AUTO` vs `WRITE_HITL`), 4-Eyes HITL Approve/Reject Controls, Official FinCEN SAR PDF Download button, and Regulatory RAG Policy Search.
   - **Portal 3: SRE & Platform Admin Console (`/sre-admin`)**
     - Accessible to `ROLE_ADMIN` (`sarah@runestone.com` / `admin@runestone.com`).
     - Features: MySQL Outbox Monitor, Quarantined Kafka Dead-Letter Queue (DLQ) 1-Click Replay, Tamper-Evident SHA-256 Cryptographic Audit Chain Verifier, Inbound `HMAC-SHA256` Webhook Simulator, and `AppCache` Reload.

2. ROLE GUARD & "DEV / INTERVIEW DEMO SWITCHER" (`client/src/components/DevQuickSwitchBar.jsx`):
   - Implement a clean `RoleProtectedRoute.jsx` wrapper that checks the active user's role. If `alice` (`ROLE_USER`) navigates directly to `/sre-admin`, show an enterprise **"403 Access Restricted — Role Isolation Enforced"** screen with a button to either return to `/dashboard` or test the API-level `403 Forbidden` separation-of-duties guard.
   - At the bottom-right corner of the screen, render a sleek, collapsible floating pill: **"🧪 Demo Mode: Role Switcher"** with 3 instant buttons:
     1. `👤 Alice (Corporate Treasurer • ROLE_USER)`
     2. `🛡️ Sarah Connor (AML Compliance Officer • ROLE_COMPLIANCE_OFFICER)`
     3. `⚙️ Platform SRE Admin (Kafka DLQ & Webhooks • ROLE_ADMIN)`
   - Clicking any persona immediately switches the active credentials/JWT, updates the sidebar navigation to show only that role's authorized portal links, and navigates to that role's home workspace—giving you both **authentic production role isolation** and **zero-friction 1-click testing**.

3. FINAL VERIFICATION GATE:
   - Run `npm run build` in `client/` and `./mvnw clean test` in `server/`.
   - Update `PROJECT_GUIDE_AND_TESTING.md` and `README.md` with the new Phase 7–10 features, routes, and testing instructions.
```