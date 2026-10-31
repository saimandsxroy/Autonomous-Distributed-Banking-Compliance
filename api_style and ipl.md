# ARCHITECTURE BLUEPRINT, MYSQL SPECIFICATION & API DESIGN INSTRUCTIONS FOR ANTIGRAVITY

**Project Name:** RuneStone Treasury & Sentinel AML Platform  
**Reference Architecture Style:** `net.engineeringdigest.journalApp` (Classical Multi-Tier Spring Boot, Concrete Services, Field Injection, Direct Entity Contracts, `SecurityContextHolder` Principal Resolution, Custom Repository `EntityManager` / `CriteriaBuilder`, `AppCache`, `@Scheduled` Workers)  
**Target Database:** MySQL 8.0+ (Spring Data JPA / Hibernate + Flyway)  
**Target Consumer:** Antigravity (Autonomous Coding Assistant for Full-Stack Implementation & Refactoring)

---

## 1. Architecture Overview

The **RuneStone Treasury & Sentinel AML** backend strictly follows the classical multi-tier Spring Boot architecture modeled after `net.engineeringdigest.journalApp`, scaled to handle **Double-Entry Accounting**, **Redis Lua Velocity & Idempotency**, **MySQL Transactional Outbox to Kafka**, **MySQL 8.0 Recursive CTE Fraud Ring Detection**, and **Google Gemini + MCP Human-in-the-Loop (HITL) Governance**.

```text
                        +-------------------------------------------------+
                        |              Spring Security Filter             |
                        |   (Stateless Auth, BCrypt, UserDetailsService)  |
                        +-----------------------+-------------------------+
                                                |
                                                v
+-------------------+   +-------------------------------------------------+   +--------------------+
| Outbox & AML      |   |                Controller Layer                 |   |     AppCache       |
| Schedulers        |   |  (REST Controllers, SecurityContext, Status)    |   |   (@PostConstruct) |
| (@Scheduled)      |   +-----------------------+-------------------------+   +---------+----------+
+---------+---------+                           |                                       |
          |                                     |                                       |
          +-----------------------------+       |                                       |
                                        v       v                                       |
                        +-------------------------------------------------+             |
                        |                 Service Layer                   |             |
                        |  (Concrete Classes Only, @Transactional,        |<------------+
                        |   Double-Entry, Redis Lua, Gemini RestTemplate) |
                        +-----------------------+-------------------------+
                                                |
                                                v
                        +-------------------------------------------------+
                        |               Repository Layer                  |
                        |  (JpaRepository<Entity, Long> + *Custom/*Impl   |
                        |   using EntityManager, Criteria & MySQL CTEs)   |
                        +-----------------------+-------------------------+
                                                |
                                                v
                        +-------------------------------------------------+
                        |                Database (MySQL 8.0)             |
                        |  (users, treasury_accounts, journal_entries,    |
                        |   posting_legs, balance_holds, outbox_events,   |
                        |   aml_investigations, config_treasury_app)      |
                        +-------------------------------------------------+
```

### Major Architectural Layers & Strict Rules

1. **Security & Authentication Layer (`config`, `service`):**
   * Configures stateless HTTP authentication (`SessionCreationPolicy.STATELESS`), disables CSRF, and wires `UserDetailsServiceImpl` with `BCryptPasswordEncoder`.
   * Controllers **never** accept the caller's `userName` from path variables, query parameters, or request bodies for user-scoped routes. Identity is always resolved via:
     ```java
     Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
     String userName = authentication.getName();
     ```

2. **Presentation / Web Layer (`controller`):**
   * Annotated with `@RestController` and `@RequestMapping`.
   * Uses `@Autowired` private field injection for services.
   * Accepts JPA entities directly via `@RequestBody` and returns wildcard `ResponseEntity<?>` with explicit `HttpStatus` codes (`200 OK`, `201 CREATED`, `204 NO_CONTENT`, `400 BAD_REQUEST`, `404 NOT_FOUND`, `409 CONFLICT`, `422 UNPROCESSABLE_ENTITY`, `503 SERVICE_UNAVAILABLE`).
   * Enforces account and journal ownership in the controller by filtering the authenticated `User`'s relational collections (`user.getTreasuryAccounts().stream().filter(...)`).
   * Uses imperative `if` checks and localized `try-catch` blocks rather than `@ControllerAdvice` or Bean Validation (`@Valid`) annotations.

3. **Service / Business Layer (`service`):**
   * Implemented **exclusively as concrete classes annotated with `@Service`** (no `IUserService` or `ITreasuryService` interfaces).
   * Manages ACID transaction boundaries using `@org.springframework.transaction.annotation.Transactional`.
   * Executes external AI & third-party HTTP calls (Google Gemini API) using `RestTemplate`, URL templates from `AppCache`, token constants from `Placeholders`, and response models in `api.response`.
   * Logs operations via SLF4J: `private static final Logger log = LoggerFactory.getLogger(CurrentService.class);`.

4. **Persistence Layer (`repository`, `entity`):**
   * Standard repositories extend `JpaRepository<Entity, Long>`.
   * Complex dynamic queries, pessimistic locking queries, and MySQL 8.0 Recursive CTE graph queries follow the canonical custom repository pattern: `<Domain>RepositoryCustom` interface + `<Domain>RepositoryImpl` class using `@PersistenceContext private EntityManager entityManager;`.
   * All entities are plain Java POJOs (`@Entity`, `@Table`, `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)`, `Long id`) with **explicit Java getters, setters, and constructors (NO Lombok)**.

5. **Cross-Cutting Components (`cache`, `scheduler`, `constants`, `api.response`):**
   * **`AppCache` (`cache`):** Pre-warms dynamic system configurations (Gemini API endpoint templates, velocity limits, high-value hold thresholds, AML hop depth) from the `config_treasury_app` MySQL table at startup via `@PostConstruct`, with a private backing `Map<String, String>` and a reload method triggered by `AdminController`.
   * **`OutboxRelayScheduler` & `AmlSweepScheduler` (`scheduler`):** Background routines driven by `@Scheduled` to relay pending MySQL outbox events (`FOR UPDATE SKIP LOCKED`) to Kafka and sweep expired holds.
   * **`Placeholders` (`constants`):** Interface holding template replacement tokens (e.g., `<API_KEY>`, `<MODEL_NAME>`, `<ACCOUNT_ID>`).
   * **`GeminiResponse` (`api.response`):** Plain Java POJOs strictly for deserializing outbound third-party Google Gemini REST API JSON payloads.

---

## 2. Package and Directory Tree

Antigravity must organize the backend (`server/`) under this exact package structure:

```text
server/
├── pom.xml
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/
│   │   │       └── runestone/
│   │   │           └── treasury/
│   │   │               ├── TreasuryApplication.java
│   │   │               ├── api/
│   │   │               │   └── response/
│   │   │               │       └── GeminiResponse.java
│   │   │               ├── cache/
│   │   │               │   └── AppCache.java
│   │   │               ├── config/
│   │   │               │   ├── KafkaConfig.java
│   │   │               │   ├── RedisConfig.java
│   │   │               │   ├── RestTemplateConfig.java
│   │   │               │   └── SpringSecurity.java
│   │   │               ├── constants/
│   │   │               │   └── Placeholders.java
│   │   │               ├── controller/
│   │   │               │   ├── AdminController.java
│   │   │               │   ├── AmlComplianceController.java
│   │   │               │   ├── BalanceHoldController.java
│   │   │               │   ├── HealthCheck.java
│   │   │               │   ├── JournalEntryController.java
│   │   │               │   ├── PublicController.java
│   │   │               │   ├── TreasuryAccountController.java
│   │   │               │   └── UserController.java
│   │   │               ├── entity/
│   │   │               │   ├── AmlInvestigation.java
│   │   │               │   ├── AmlPolicyChunk.java
│   │   │               │   ├── BalanceHold.java
│   │   │               │   ├── ComplianceAuditLog.java
│   │   │               │   ├── ConfigTreasuryAppEntity.java
│   │   │               │   ├── DeadLetterEvent.java
│   │   │               │   ├── IdempotencyRecord.java
│   │   │               │   ├── JournalEntry.java
│   │   │               │   ├── McpApprovalRequest.java
│   │   │               │   ├── OutboxEvent.java
│   │   │               │   ├── PostingLeg.java
│   │   │               │   ├── TreasuryAccount.java
│   │   │               │   └── User.java
│   │   │               ├── repository/
│   │   │               │   ├── AmlInvestigationRepository.java
│   │   │               │   ├── AmlPolicyChunkRepository.java
│   │   │               │   ├── BalanceHoldRepository.java
│   │   │               │   ├── ComplianceAuditLogRepository.java
│   │   │               │   ├── ConfigTreasuryAppRepository.java
│   │   │               │   ├── DeadLetterEventRepository.java
│   │   │               │   ├── IdempotencyRecordRepository.java
│   │   │               │   ├── JournalEntryRepository.java
│   │   │               │   ├── McpApprovalRequestRepository.java
│   │   │               │   ├── OutboxEventRepository.java
│   │   │               │   ├── OutboxEventRepositoryCustom.java
│   │   │               │   ├── OutboxEventRepositoryImpl.java
│   │   │               │   ├── PostingLegRepository.java
│   │   │               │   ├── PostingLegRepositoryCustom.java
│   │   │               │   ├── PostingLegRepositoryImpl.java
│   │   │               │   ├── TreasuryAccountRepository.java
│   │   │               │   ├── TreasuryAccountRepositoryCustom.java
│   │   │               │   ├── TreasuryAccountRepositoryImpl.java
│   │   │               │   ├── UserRepository.java
│   │   │               │   ├── UserRepositoryCustom.java
│   │   │               │   └── UserRepositoryImpl.java
│   │   │               ├── scheduler/
│   │   │               │   ├── AmlSweepScheduler.java
│   │   │               │   └── OutboxRelayScheduler.java
│   │   │               └── service/
│   │   │                   ├── AmlComplianceService.java
│   │   │                   ├── AmlPolicyRagService.java
│   │   │                   ├── BalanceHoldService.java
│   │   │                   ├── GeminiDetectiveService.java
│   │   │                   ├── IdempotencyService.java
│   │   │                   ├── JournalEntryService.java
│   │   │                   ├── OutboxEventService.java
│   │   │                   ├── TreasuryAccountService.java
│   │   │                   ├── UserDetailsServiceImpl.java
│   │   │                   ├── UserService.java
│   │   │                   └── VelocityRiskService.java
│   │   └── resources/
│   │       ├── application.properties
│   │       ├── db/migration/
│   │       │   ├── V1__init_users_and_config_mysql.sql
│   │       │   ├── V2__double_entry_treasury_mysql.sql
│   │       │   ├── V3__idempotency_outbox_dlq_mysql.sql
│   │       │   └── V4__aml_rag_and_mcp_hitl_mysql.sql
│   │       └── redis/
│   │           ├── token_bucket_rate_limit.lua
│   │           └── transfer_velocity_window.lua
│   └── test/
│       └── java/
│           └── com/
│               └── runestone/
│                   └── treasury/
│                       ├── TreasuryApplicationTests.java
│                       ├── repository/
│                       │   ├── PostingLegRepositoryImplTests.java
│                       │   └── UserRepositoryImplTests.java
│                       └── service/
│                           ├── DoubleEntryConcurrencyTests.java
│                           ├── JournalEntryServiceTests.java
│                           ├── UserDetailsServiceImplTests.java
│                           └── UserServiceTests.java
```

---

## 3. API Design Rules & Complete Endpoint Specification

All endpoints follow the `journalApp` conventions:
* Direct JPA Entity payloads (`@RequestBody User`, `@RequestBody TreasuryAccount`, `@RequestBody JournalEntry`, `@RequestBody McpApprovalRequest`).
* Wildcard `ResponseEntity<?>` return types.
* Authenticated identity derived strictly from `SecurityContextHolder.getContext().getAuthentication().getName()`.
* Empty collections or unowned entity lookups return `new ResponseEntity<>(HttpStatus.NOT_FOUND)`.

### Complete Controller & Route Matrix

| Controller | Base Path | Endpoint Path | Method | Auth Required | Request Body / Params | Return Type & Status Codes |
|---|---|---|---|---|---|---|
| `HealthCheck` | *(none)* | `/health-check` | `GET` | No | None | `String "Ok"` (`200 OK`) |
| `PublicController` | `/public` | `/public/health-check` | `GET` | No | None | `String "Ok"` (`200 OK`) |
| `PublicController` | `/public` | `/public/create-user` | `POST` | No | `@RequestBody User` | `ResponseEntity<?>`: `201 CREATED` or `400 BAD_REQUEST` |
| `UserController` | `/user` | `/user` | `PUT` | Authenticated | `@RequestBody User` | `ResponseEntity<?>`: `204 NO_CONTENT` or `400 BAD_REQUEST` |
| `UserController` | `/user` | `/user` | `DELETE` | Authenticated | None | `ResponseEntity<?>`: `204 NO_CONTENT` |
| `TreasuryAccountController` | `/account` | `/account` | `GET` | Authenticated | None | `ResponseEntity<?>`: `200 OK` (`List<TreasuryAccount>`) or `404 NOT_FOUND` |
| `TreasuryAccountController` | `/account` | `/account` | `POST` | Authenticated | `@RequestBody TreasuryAccount` | `ResponseEntity<?>`: `201 CREATED` or `400 BAD_REQUEST` |
| `TreasuryAccountController` | `/account` | `/account/id/{myId}` | `GET` | Authenticated | `@PathVariable Long myId` | `ResponseEntity<?>`: `200 OK` (`TreasuryAccount`) or `404 NOT_FOUND` |
| `JournalEntryController` | `/journal` | `/journal` | `GET` | Authenticated | None | `ResponseEntity<?>`: `200 OK` (`List<JournalEntry>`) or `404 NOT_FOUND` |
| `JournalEntryController` | `/journal` | `/journal` | `POST` | Authenticated | `@RequestHeader("Idempotency-Key") String idempotencyKey`, `@RequestBody JournalEntry` | `ResponseEntity<?>`: `201 CREATED` (Settled or Hold), `200 OK` (Idempotent Replay), `409 CONFLICT` (In-Flight), `422 UNPROCESSABLE_ENTITY` (Hash Mismatch), or `400 BAD_REQUEST` |
| `JournalEntryController` | `/journal` | `/journal/id/{myId}` | `GET` | Authenticated | `@PathVariable Long myId` | `ResponseEntity<?>`: `200 OK` (`JournalEntry` with `PostingLeg` list) or `404 NOT_FOUND` |
| `BalanceHoldController` | `/hold` | `/hold` | `GET` | Authenticated | None | `ResponseEntity<?>`: `200 OK` (`List<BalanceHold>`) or `404 NOT_FOUND` |
| `BalanceHoldController` | `/hold` | `/hold/id/{myId}` | `GET` | Authenticated | `@PathVariable Long myId` | `ResponseEntity<?>`: `200 OK` (`BalanceHold`) or `404 NOT_FOUND` |
| `AmlComplianceController` | `/compliance` | `/compliance/investigations` | `GET` | `ROLE_ADMIN` | None | `ResponseEntity<?>`: `200 OK` (`List<AmlInvestigation>`) or `404 NOT_FOUND` |
| `AmlComplianceController` | `/compliance` | `/compliance/graph/account/{accountId}` | `GET` | `ROLE_ADMIN` | `@PathVariable Long accountId` | `ResponseEntity<?>`: `200 OK` (5-Hop MySQL Recursive CTE Cycle List) or `404 NOT_FOUND` |
| `AmlComplianceController` | `/compliance` | `/compliance/investigate/hold/{holdId}` | `POST` | `ROLE_ADMIN` | `@PathVariable Long holdId` | `ResponseEntity<?>`: `201 CREATED` (`AmlInvestigation`) or `503 SERVICE_UNAVAILABLE` |
| `AmlComplianceController` | `/compliance` | `/compliance/approvals` | `GET` | `ROLE_ADMIN` | None | `ResponseEntity<?>`: `200 OK` (`List<McpApprovalRequest>`) or `404 NOT_FOUND` |
| `AmlComplianceController` | `/compliance` | `/compliance/approvals/id/{approvalId}` | `PUT` | `ROLE_ADMIN` | `@PathVariable Long approvalId`, `@RequestBody McpApprovalRequest` | `ResponseEntity<?>`: `200 OK` (Executes Hold Settlement or Reversal + Account Freeze) or `404 NOT_FOUND` |
| `AdminController` | `/admin` | `/admin/all-users` | `GET` | `ROLE_ADMIN` | None | `ResponseEntity<?>`: `200 OK` (`List<User>`) or `404 NOT_FOUND` |
| `AdminController` | `/admin` | `/admin/create-admin-user` | `POST` | `ROLE_ADMIN` | `@RequestBody User` | `ResponseEntity<?>`: `201 CREATED` or `400 BAD_REQUEST` |
| `AdminController` | `/admin` | `/admin/clear-app-cache` | `POST` | `ROLE_ADMIN` | None | `ResponseEntity<String>`: `200 OK` (`"AppCache reloaded"`) |
| `AdminController` | `/admin` | `/admin/dlq` | `GET` | `ROLE_ADMIN` | None | `ResponseEntity<?>`: `200 OK` (`List<DeadLetterEvent>`) or `404 NOT_FOUND` |
| `AdminController` | `/admin` | `/admin/dlq/replay/{dlqId}` | `POST` | `ROLE_ADMIN` | `@PathVariable Long dlqId` | `ResponseEntity<?>`: `200 OK` or `404 NOT_FOUND` |
| `AdminController` | `/admin` | `/admin/demo/seed-aml-ring` | `POST` | `ROLE_ADMIN` | None | `ResponseEntity<?>`: `201 CREATED` (Seeds 3-hop circular ring & velocity burst) |

---

## 4. Complete MySQL 8.0 Database Schema (Flyway Migrations)

All tables use **MySQL 8.0 InnoDB**, `BIGINT AUTO_INCREMENT PRIMARY KEY` (mapped to `Long id` in Java entities), `DECIMAL(19, 4)` for financial precision, native MySQL `JSON` columns, and MySQL `CHECK` constraints (enforced natively since MySQL 8.0.16).

### `V1__init_users_and_config_mysql.sql`
```sql
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(150),
    aml_monitoring_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL,
    role VARCHAR(50) NOT NULL,
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS config_treasury_app (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL
) ENGINE=InnoDB;

INSERT INTO config_treasury_app (config_key, config_value) VALUES
('GEMINI_API_URL', 'https://generativelanguage.googleapis.com/v1beta/models/<MODEL_NAME>:generateContent?key=<API_KEY>'),
('GEMINI_MODEL_NAME', 'gemini-2.5-flash'),
('VELOCITY_MAX_TX_2M', '5'),
('HIGH_VALUE_HOLD_THRESHOLD', '10000.0000'),
('AML_MAX_HOP_DEPTH', '5');
```

### `V2__double_entry_treasury_mysql.sql`
```sql
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
```

### `V3__idempotency_outbox_dlq_mysql.sql`
```sql
CREATE TABLE IF NOT EXISTS idempotency_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    request_hash CHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL,
    http_status INT,
    response_body JSON,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_user_idemp_key (user_name, idempotency_key)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS outbox_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    aggregate_type VARCHAR(64) NOT NULL,
    aggregate_id BIGINT NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    topic VARCHAR(128) NOT NULL,
    payload JSON NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    next_attempt_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    last_error TEXT,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    published_at DATETIME(6),
    INDEX idx_outbox_polling (status, next_attempt_at, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dead_letter_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    outbox_event_id BIGINT,
    original_topic VARCHAR(128) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload JSON NOT NULL,
    failure_reason TEXT NOT NULL,
    replayed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    replayed_at DATETIME(6)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS compliance_audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_user_name VARCHAR(100) NOT NULL,
    action_type VARCHAR(64) NOT NULL,
    target_entity_id BIGINT NOT NULL,
    payload JSON NOT NULL,
    previous_hash CHAR(64) NOT NULL,
    record_hash CHAR(64) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;
```

### `V4__aml_rag_and_mcp_hitl_mysql.sql`
```sql
CREATE TABLE IF NOT EXISTS aml_policy_chunks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    regulation_code VARCHAR(64) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    typology_category VARCHAR(64) NOT NULL,
    content TEXT NOT NULL,
    embedding_json JSON NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS aml_investigations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    balance_hold_id BIGINT NOT NULL UNIQUE,
    composite_risk_score INT NOT NULL,
    verdict VARCHAR(64) NOT NULL,
    detected_graph_paths JSON NOT NULL,
    cited_regulations JSON NOT NULL,
    tool_execution_trace JSON NOT NULL,
    executive_summary TEXT NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_investigation_hold FOREIGN KEY (balance_hold_id) REFERENCES balance_holds(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mcp_approval_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    investigation_id BIGINT NOT NULL,
    balance_hold_id BIGINT NOT NULL,
    tool_name VARCHAR(64) NOT NULL,
    tool_arguments JSON NOT NULL,
    ai_rationale TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_APPROVAL',
    decided_by_user_name VARCHAR(100),
    reviewer_notes TEXT,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    decided_at DATETIME(6),
    CONSTRAINT fk_mcp_investigation FOREIGN KEY (investigation_id) REFERENCES aml_investigations(id),
    CONSTRAINT fk_mcp_hold FOREIGN KEY (balance_hold_id) REFERENCES balance_holds(id)
) ENGINE=InnoDB;
```

---

## 5. End-to-End Request Traces

### Trace 1: Double-Entry Transfer & Ownership Verification (`POST /journal`)
**Goal:** Execute an idempotent double-entry transfer between two accounts owned/authorized by the caller, evaluating Redis velocity and persisting balanced `PostingLeg` entries or a `BalanceHold`.

```text
Client (HTTP POST /journal with Basic/JWT Auth + Header "Idempotency-Key: tx-101")
Body: {"sourceAccountId": 1, "destinationAccountId": 2, "amount": 500.0000, "currency": "USD", "title": "Vendor Settlement"}
   |
   v
SpringSecurity Filter Chain
   |   Validates credentials via UserDetailsServiceImpl
   v
JournalEntryController.createEntry(@RequestBody JournalEntry myEntry, @RequestHeader("Idempotency-Key") String key)
   |
   +---> SecurityContextHolder.getContext().getAuthentication().getName() --> "ram"
   |
   +---> UserService.findByUserName("ram") --> Returns User entity
   |
   +---> Ownership Check (Controller-level stream filter):
   |     Verifies user.getTreasuryAccounts() contains sourceAccountId == 1
   |     (If false --> returns ResponseEntity<>(HttpStatus.NOT_FOUND))
   |
   +---> IdempotencyService.checkAndLock("ram", key, myEntry)
   |     Checks Redis SET NX + MySQL idempotency_records SHA-256 hash
   |
   +---> VelocityRiskService.evaluateVelocity(1L, 500.0000)
   |     Executes atomic Redis Lua sliding-window script + AppCache thresholds
   |
   +---> JournalEntryService.saveEntry(myEntry, "ram", holdRequired, riskReason) [@Transactional begins]
   |        |
   |        +---> TreasuryAccountRepositoryImpl.lockAccountsSorted(1L, 2L)
   |        |     MySQL: SELECT * FROM treasury_accounts WHERE id IN (1, 2) ORDER BY id ASC FOR UPDATE
   |        |
   |        +---> Case A (Clean Transfer):
   |        |     Debits Account 1, Credits Account 2
   |        |     Creates 2 PostingLeg entities (-500.0000 DEBIT, +500.0000 CREDIT)
   |        |     Verifies sum of signedAmount == 0.0000
   |        |     Saves JournalEntry + updates user.getJournalEntries().add(saved)
   |        |     OutboxEventService.savePendingEvent("transaction.completed", ...)
   |        |
   |        +---> Case B (Flagged for AML Hold):
   |              Moves 500.0000 from availableBalance to heldBalance on Account 1
   |              Saves BalanceHold (status = "PENDING_HOLD")
   |              OutboxEventService.savePendingEvent("transaction.flagged", ...)
   |              [@Transactional commits MySQL transaction]
   |
   v
Returns new ResponseEntity<>(myEntry, HttpStatus.CREATED) [HTTP 201]
```

### Trace 2: Gemini AI Fraud Investigation via `AppCache` & `RestTemplate` (`POST /compliance/investigate/hold/{holdId}`)
**Goal:** Investigate a `PENDING_HOLD` using the MySQL 5-hop Recursive CTE, `AmlPolicyRagService`, and `RestTemplate` to call Google Gemini API, queuing a Human-in-the-Loop `McpApprovalRequest`.

```text
Client / Kafka Listener --> GeminiDetectiveService.investigateHold(Long holdId)
   |
   +---> PostingLegRepositoryImpl.findCircularTransferRings(sourceAccountId, 5)
   |     Executes MySQL 8.0 WITH RECURSIVE transfer_ring CTE via EntityManager
   |
   +---> AmlPolicyRagService.findTopMatchingPolicies(riskReason)
   |     Loads aml_policy_chunks from MySQL & computes cosine similarity
   |
   +---> AppCache lookup:
   |     String template = appCache.get(AppCache.Keys.GEMINI_API_URL.name());
   |     String finalUrl = template.replace(Placeholders.MODEL_NAME, model).replace(Placeholders.API_KEY, apiKey);
   |
   +---> RestTemplate.exchange(finalUrl, HttpMethod.POST, requestEntity, GeminiResponse.class)
   |     Deserializes JSON into api.response.GeminiResponse
   |
   +---> Saves AmlInvestigation + creates McpApprovalRequest (status = "PENDING_APPROVAL")
   |     (AI never mutates balances directly; waits for PUT /compliance/approvals/id/{id})
   v
Returns AmlInvestigation entity (HTTP 201 CREATED or HTTP 503 SERVICE_UNAVAILABLE if API key missing)
```

---

## 6. Canonical Code Examples (Strict `journalApp` Reference Style)

### 1. Canonical Controller: `JournalEntryController.java`
```java
package com.runestone.treasury.controller;

import com.runestone.treasury.entity.JournalEntry;
import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.entity.User;
import com.runestone.treasury.service.IdempotencyService;
import com.runestone.treasury.service.JournalEntryService;
import com.runestone.treasury.service.UserService;
import com.runestone.treasury.service.VelocityRiskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/journal")
public class JournalEntryController {

    @Autowired
    private JournalEntryService journalEntryService;

    @Autowired
    private UserService userService;

    @Autowired
    private IdempotencyService idempotencyService;

    @Autowired
    private VelocityRiskService velocityRiskService;

    @GetMapping
    public ResponseEntity<?> getAllJournalEntriesOfUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userName = authentication.getName();
        User user = userService.findByUserName(userName);
        List<JournalEntry> all = user.getJournalEntries();
        if (all != null && !all.isEmpty()) {
            return new ResponseEntity<>(all, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @PostMapping
    public ResponseEntity<?> createEntry(
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestBody JournalEntry myEntry) {
        try {
            if (idempotencyKey == null || idempotencyKey.trim().isEmpty()) {
                return new ResponseEntity<>("Missing Idempotency-Key header", HttpStatus.BAD_REQUEST);
            }
            if (myEntry.getAmount() == null || myEntry.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
                return new ResponseEntity<>("Transfer amount must be positive", HttpStatus.BAD_REQUEST);
            }

            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userName = authentication.getName();
            User user = userService.findByUserName(userName);

            List<TreasuryAccount> ownedSource = user.getTreasuryAccounts().stream()
                    .filter(x -> x.getId().equals(myEntry.getSourceAccountId()))
                    .collect(Collectors.toList());

            if (ownedSource.isEmpty()) {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }

            myEntry.setIdempotencyKey(idempotencyKey);
            String riskReason = velocityRiskService.evaluateTransferRisk(myEntry);
            boolean holdForAml = (riskReason != null);

            journalEntryService.saveEntry(myEntry, userName, holdForAml, riskReason);
            return new ResponseEntity<>(myEntry, HttpStatus.CREATED);
        } catch (Exception e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/id/{myId}")
    public ResponseEntity<?> getJournalEntryById(@PathVariable Long myId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userName = authentication.getName();
        User user = userService.findByUserName(userName);
        List<JournalEntry> collect = user.getJournalEntries().stream()
                .filter(x -> x.getId().equals(myId))
                .collect(Collectors.toList());
        if (!collect.isEmpty()) {
            Optional<JournalEntry> journalEntry = journalEntryService.findById(myId);
            if (journalEntry.isPresent()) {
                return new ResponseEntity<>(journalEntry.get(), HttpStatus.OK);
            }
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }
}
```

### 2. Canonical Custom Repository with MySQL 8.0 Recursive CTE & Locking: `PostingLegRepositoryImpl.java`
```java
package com.runestone.treasury.repository;

import org.springframework.stereotype.Repository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import java.util.List;

@Repository
public class PostingLegRepositoryImpl implements PostingLegRepositoryCustom {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @SuppressWarnings("unchecked")
    public List<Object[]> findCircularTransferRingsMySql(Long suspectAccountId, int maxHopDepth) {
        String sql = """
            WITH RECURSIVE transfer_ring AS (
                SELECT
                    pl.account_id AS origin_account_id,
                    pl.account_id AS from_account_id,
                    pl.counterparty_account_id AS to_account_id,
                    pl.amount AS initial_amount,
                    pl.amount AS hop_amount,
                    1 AS hop_depth,
                    CAST(CONCAT(',', pl.account_id, ',', pl.counterparty_account_id, ',') AS CHAR(1000)) AS account_path,
                    pl.created_at AS hop_timestamp,
                    0 AS is_cycle
                FROM posting_legs pl
                WHERE pl.account_id = :suspectAccountId
                  AND pl.leg_type = 'DEBIT'
                  AND pl.created_at >= NOW(6) - INTERVAL 24 HOUR

                UNION ALL

                SELECT
                    tr.origin_account_id,
                    next_leg.account_id AS from_account_id,
                    next_leg.counterparty_account_id AS to_account_id,
                    tr.initial_amount,
                    next_leg.amount AS hop_amount,
                    tr.hop_depth + 1 AS hop_depth,
                    CAST(CONCAT(tr.account_path, next_leg.counterparty_account_id, ',') AS CHAR(1000)) AS account_path,
                    next_leg.created_at AS hop_timestamp,
                    CASE WHEN next_leg.counterparty_account_id = tr.origin_account_id THEN 1 ELSE 0 END AS is_cycle
                FROM transfer_ring tr
                INNER JOIN posting_legs next_leg
                    ON next_leg.account_id = tr.to_account_id
                   AND next_leg.leg_type = 'DEBIT'
                   AND next_leg.created_at >= tr.hop_timestamp
                WHERE tr.hop_depth < :maxHopDepth
                  AND tr.is_cycle = 0
                  AND (
                      next_leg.counterparty_account_id = tr.origin_account_id
                      OR LOCATE(CONCAT(',', next_leg.counterparty_account_id, ','), tr.account_path) = 0
                  )
            )
            SELECT origin_account_id, hop_depth, initial_amount, hop_amount, account_path, is_cycle
            FROM transfer_ring
            WHERE is_cycle = 1 OR hop_depth >= 3
            ORDER BY is_cycle DESC, hop_depth DESC
            """;

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("suspectAccountId", suspectAccountId);
        query.setParameter("maxHopDepth", maxHopDepth);
        return query.getResultList();
    }
}
```

### 3. Canonical Concrete Service with `@Transactional`: `JournalEntryService.java`
```java
package com.runestone.treasury.service;

import com.runestone.treasury.entity.BalanceHold;
import com.runestone.treasury.entity.JournalEntry;
import com.runestone.treasury.entity.PostingLeg;
import com.runestone.treasury.entity.TreasuryAccount;
import com.runestone.treasury.entity.User;
import com.runestone.treasury.repository.BalanceHoldRepository;
import com.runestone.treasury.repository.JournalEntryRepository;
import com.runestone.treasury.repository.PostingLegRepository;
import com.runestone.treasury.repository.TreasuryAccountRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Service
public class JournalEntryService {

    private static final Logger log = LoggerFactory.getLogger(JournalEntryService.class);

    @Autowired
    private JournalEntryRepository journalEntryRepository;

    @Autowired
    private PostingLegRepository postingLegRepository;

    @Autowired
    private TreasuryAccountRepository treasuryAccountRepository;

    @Autowired
    private BalanceHoldRepository balanceHoldRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private OutboxEventService outboxEventService;

    @Transactional
    public void saveEntry(JournalEntry myEntry, String userName, boolean holdForAml, String riskReason) {
        try {
            User user = userService.findByUserName(userName);
            Long firstLockId = Math.min(myEntry.getSourceAccountId(), myEntry.getDestinationAccountId());
            Long secondLockId = Math.max(myEntry.getSourceAccountId(), myEntry.getDestinationAccountId());

            List<TreasuryAccount> locked = treasuryAccountRepository.lockAccountsInOrder(
                    Arrays.asList(firstLockId, secondLockId));

            if (locked.size() != 2) {
                throw new IllegalStateException("Source or destination treasury account not found");
            }

            TreasuryAccount source = locked.get(0).getId().equals(myEntry.getSourceAccountId())
                    ? locked.get(0) : locked.get(1);
            TreasuryAccount destination = locked.get(0).getId().equals(myEntry.getDestinationAccountId())
                    ? locked.get(0) : locked.get(1);

            BigDecimal amount = myEntry.getAmount();
            if (source.getAvailableBalance().compareTo(amount) < 0) {
                throw new IllegalStateException("Insufficient available balance");
            }

            myEntry.setDate(LocalDateTime.now());

            if (holdForAml) {
                source.setAvailableBalance(source.getAvailableBalance().subtract(amount));
                source.setHeldBalance(source.getHeldBalance().add(amount));
                treasuryAccountRepository.save(source);

                myEntry.setStatus("PENDING_HOLD");
                JournalEntry savedEntry = journalEntryRepository.save(myEntry);
                user.getJournalEntries().add(savedEntry);
                userService.saveUser(user);

                BalanceHold hold = new BalanceHold();
                hold.setIdempotencyKey(myEntry.getIdempotencyKey());
                hold.setSourceAccountId(source.getId());
                hold.setDestinationAccountId(destination.getId());
                hold.setAmount(amount);
                hold.setCurrency(myEntry.getCurrency());
                hold.setStatus("PENDING_HOLD");
                hold.setRiskReason(riskReason);
                hold.setExpiresAt(LocalDateTime.now().plusHours(24));
                BalanceHold savedHold = balanceHoldRepository.save(hold);

                outboxEventService.recordEvent("BalanceHold", savedHold.getId(), "transaction.flagged", savedHold);
                log.warn("Transfer placed in PENDING_HOLD for user {}: holdId={}", userName, savedHold.getId());
                return;
            }

            source.setAvailableBalance(source.getAvailableBalance().subtract(amount));
            source.setPostedBalance(source.getAvailableBalance().add(source.getHeldBalance()));

            destination.setAvailableBalance(destination.getAvailableBalance().add(amount));
            destination.setPostedBalance(destination.getAvailableBalance().add(destination.getHeldBalance()));

            treasuryAccountRepository.save(source);
            treasuryAccountRepository.save(destination);

            myEntry.setStatus("SETTLED");
            JournalEntry saved = journalEntryRepository.save(myEntry);

            PostingLeg debitLeg = new PostingLeg(saved.getId(), source.getId(), destination.getId(),
                    "DEBIT", amount, amount.negate(), source.getPostedBalance());
            PostingLeg creditLeg = new PostingLeg(saved.getId(), destination.getId(), source.getId(),
                    "CREDIT", amount, amount, destination.getPostedBalance());

            BigDecimal netZeroCheck = debitLeg.getSignedAmount().add(creditLeg.getSignedAmount());
            if (netZeroCheck.compareTo(BigDecimal.ZERO) != 0) {
                throw new IllegalStateException("Double-entry invariant violated");
            }

            postingLegRepository.save(debitLeg);
            postingLegRepository.save(creditLeg);

            user.getJournalEntries().add(saved);
            userService.saveUser(user);

            outboxEventService.recordEvent("JournalEntry", saved.getId(), "transaction.completed", saved);
            log.info("Double-entry transfer settled successfully for user {}: journalId={}", userName, saved.getId());
        } catch (Exception e) {
            log.error("Failed to execute double-entry transfer for user {}: {}", userName, e.getMessage());
            throw e;
        }
    }

    public Optional<JournalEntry> findById(Long id) {
        return journalEntryRepository.findById(id);
    }
}
```

### 4. Canonical `AppCache`: `AppCache.java`
```java
package com.runestone.treasury.cache;

import com.runestone.treasury.entity.ConfigTreasuryAppEntity;
import com.runestone.treasury.repository.ConfigTreasuryAppRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class AppCache {

    private static final Logger log = LoggerFactory.getLogger(AppCache.class);

    public enum Keys {
        GEMINI_API_URL,
        GEMINI_MODEL_NAME,
        VELOCITY_MAX_TX_2M,
        HIGH_VALUE_HOLD_THRESHOLD,
        AML_MAX_HOP_DEPTH
    }

    @Autowired
    private ConfigTreasuryAppRepository configTreasuryAppRepository;

    private Map<String, String> appCache = new HashMap<>();

    @PostConstruct
    public void init() {
        appCache.clear();
        List<ConfigTreasuryAppEntity> all = configTreasuryAppRepository.findAll();
        for (ConfigTreasuryAppEntity config : all) {
            appCache.put(config.getConfigKey(), config.getConfigValue());
        }
        log.info("AppCache initialized with {} configuration entries from MySQL", appCache.size());
    }

    public String get(String key) {
        return appCache.get(key);
    }
}
```

---

## 7. Phase-by-Phase Antigravity Implementation Prompts (MySQL + `journalApp` Style)

Copy and paste each prompt sequentially into **Antigravity**.

### Phase 1 Prompt: Package Restructuring, MySQL 8.0 Setup & Double-Entry Entities
```text
@workspace Act as a Senior Spring Boot Architect. Refactor and build Phase 1 of the RuneStone Treasury & Sentinel AML backend in `server/` strictly following the `journalApp` Reference Architecture and using MySQL 8.0:

1. INFRASTRUCTURE & POM.XML:
   - In `infra/docker-compose.yml`, replace PostgreSQL with `mysql:8.0` (database `runestone_treasury`, port `3306`), keep `redis:7.2-alpine` (`6379`), and `bitnami/kafka:3.7` (`9092`).
   - In `server/pom.xml`, replace PostgreSQL dependencies with `mysql-connector-j` and `flyway-mysql`. Remove all Kotlin files/plugins and Lombok so the project uses pure Java POJOs with explicit getters and setters.

2. PACKAGE STRUCTURE (`com.runestone.treasury`):
   - Organize strictly into: `controller`, `service`, `repository`, `entity`, `config`, `cache`, `scheduler`, `constants`, and `api.response`.
   - Use `@Autowired` private field injection across all controllers, services, caches, and schedulers.
   - Make all services concrete `@Service` classes (no service interfaces).

3. MYSQL FLYWAY MIGRATIONS & POJO ENTITIES:
   - Create `V1__init_users_and_config_mysql.sql` and `V2__double_entry_treasury_mysql.sql` using `BIGINT AUTO_INCREMENT PRIMARY KEY` and `DECIMAL(19,4)`.
   - Create plain POJO entities (`Long id`, `@GeneratedValue(strategy = GenerationType.IDENTITY)`, no Lombok): `User`, `ConfigTreasuryAppEntity`, `TreasuryAccount`, `JournalEntry`, `PostingLeg`, and `BalanceHold`.
   - Implement `AppCache` (`@PostConstruct` loading `config_treasury_app` into a private `Map<String, String>` with a `public String get(String key)` accessor).

4. DOUBLE-ENTRY LEDGER & DETERMINISTIC LOCKING:
   - Implement `TreasuryAccountRepositoryCustom` and `TreasuryAccountRepositoryImpl` using `@PersistenceContext private EntityManager entityManager;` to lock account IDs in ascending order (`SELECT * FROM treasury_accounts WHERE id IN (:ids) ORDER BY id ASC FOR UPDATE`).
   - Implement `JournalEntryService`, `TreasuryAccountService`, `UserService`, `PublicController`, `UserController`, `TreasuryAccountController`, `JournalEntryController`, and `HealthCheck` returning `ResponseEntity<?>` and resolving caller identity via `SecurityContextHolder.getContext().getAuthentication().getName()`.

5. VERIFICATION:
   - Run `./mvnw clean test` and verify 100-thread concurrent bidirectional transfers pass on MySQL 8.0 with zero deadlocks and exact double-entry zero-sum conservation.
```

### Phase 2 Prompt: Multi-Layer Idempotency & Redis Lua Velocity Service
```text
@workspace Execute Phase 2 in `server/` strictly following the `journalApp` Reference Architecture:

1. MYSQL MIGRATION & ENTITY:
   - Add `V3__idempotency_outbox_dlq_mysql.sql` creating `idempotency_records`, `outbox_events`, `dead_letter_events`, and `compliance_audit_logs` in MySQL 8.0.
   - Create plain POJO entities `IdempotencyRecord`, `OutboxEvent`, `DeadLetterEvent`, and `ComplianceAuditLog` (explicit getters/setters, `Long id`).

2. CONCRETE SERVICES (`IdempotencyService` & `VelocityRiskService`):
   - Inject `StringRedisTemplate`, `IdempotencyRecordRepository`, and `AppCache` using `@Autowired` private fields.
   - In `IdempotencyService`, acquire a Redis `SET NX EX 60` lock (`409 CONFLICT` if in-flight), verify the SHA-256 request hash in MySQL (`422 UNPROCESSABLE_ENTITY` on mismatch), and replay cached JSON responses (`200 OK`) when completed.
   - In `VelocityRiskService`, execute atomic Redis Lua scripts (`transfer_velocity_window.lua`) reading thresholds from `AppCache` (`VELOCITY_MAX_TX_2M` and `HIGH_VALUE_HOLD_THRESHOLD`). If breached, flag the transfer so `JournalEntryService.saveEntry` places funds into `BalanceHold` (`PENDING_HOLD`).

3. VERIFICATION:
   - Write unit and integration tests in `src/test/java/com/runestone/treasury/service/` using `@ExtendWith(MockitoExtension.class)` (`@InjectMocks` / `@Mock`) and Testcontainers MySQL + Redis. Run `./mvnw test`.
```

### Phase 3 Prompt: MySQL `SKIP LOCKED` Outbox Scheduler & Kafka DLQ Replay
```text
@workspace Execute Phase 3 in `server/` strictly following the `journalApp` Reference Architecture:

1. CUSTOM OUTBOX REPOSITORY (`OutboxEventRepositoryCustom` & `OutboxEventRepositoryImpl`):
   - Use `@PersistenceContext private EntityManager entityManager;` to poll pending MySQL outbox rows using native MySQL 8.0 syntax:
     `SELECT * FROM outbox_events WHERE status = 'PENDING' AND next_attempt_at <= NOW(6) ORDER BY created_at ASC LIMIT 50 FOR UPDATE SKIP LOCKED`.

2. SCHEDULED RELAY (`OutboxRelayScheduler` in `scheduler/`):
   - Annotate with `@Component` and `@Scheduled(fixedDelay = 1000)`.
   - Inject `OutboxEventService` via `@Autowired` private field to publish pending events to Kafka and route failures exceeding 3 retries into `dead_letter_events`.

3. ADMIN DLQ & CACHE ENDPOINTS (`AdminController`):
   - Implement `@PostMapping("/clear-app-cache")`, `@GetMapping("/dlq")`, and `@PostMapping("/dlq/replay/{dlqId}")` returning `ResponseEntity<?>`.
   - Verify with `./mvnw test`.
```

### Phase 4 & 5 Prompt: MySQL 8.0 Recursive CTE Graph Engine, Gemini `RestTemplate` Detective & MCP HITL Approvals
```text
@workspace Execute Phases 4 & 5 in `server/` strictly following the `journalApp` Reference Architecture:

1. MYSQL 8.0 RECURSIVE CTE (`PostingLegRepositoryCustom` & `PostingLegRepositoryImpl`):
   - Implement `findCircularTransferRingsMySql(Long suspectAccountId, int maxHopDepth)` using `@PersistenceContext private EntityManager entityManager;` and MySQL 8.0 `WITH RECURSIVE transfer_ring AS (...)` over `posting_legs` to detect 5-hop circular money-laundering loops (`A -> B -> C -> A`).

2. MYSQL RAG & GEMINI API INTEGRATION (`AmlPolicyRagService` & `GeminiDetectiveService`):
   - Create `V4__aml_rag_and_mcp_hitl_mysql.sql` and plain POJO entities `AmlPolicyChunk`, `AmlInvestigation`, and `McpApprovalRequest`.
   - Create `GeminiResponse.java` in `api.response/` (mirroring `WeatherResponse` in `journalApp`) and token constants in `constants/Placeholders.java`.
   - In `GeminiDetectiveService`, fetch the URL template from `AppCache.Keys.GEMINI_API_URL`, substitute placeholders, and call the Google Gemini REST API using `@Autowired private RestTemplate restTemplate;`.
   - Automatically run read-only checks (5-hop MySQL Recursive CTE + Redis velocity profile + MySQL policy cosine similarity) and create a `McpApprovalRequest` (`status = "PENDING_APPROVAL"`) proposing either `propose_release_balance_hold` or `propose_reverse_and_freeze`.

3. COMPLIANCE CONTROLLER (`AmlComplianceController`):
   - Expose `GET /compliance/investigations`, `GET /compliance/graph/account/{accountId}`, `POST /compliance/investigate/hold/{holdId}`, `GET /compliance/approvals`, and `PUT /compliance/approvals/id/{approvalId}` returning `ResponseEntity<?>`.
   - When an admin approves a request via `PUT /compliance/approvals/id/{approvalId}`, atomically settle or reverse the `BalanceHold` and update `TreasuryAccount.status`.
   - Verify all unit and MySQL integration tests pass via `./mvnw test`.
```

### Phase 6 Prompt: React + TypeScript Operator Console Connected to `journalApp`-Style Endpoints
```text
@workspace Execute Phase 6 in `client/`:
Update the React + TypeScript + Tailwind CSS frontend to connect to our new MySQL `journalApp`-style REST endpoints (`/public/**`, `/user/**`, `/account/**`, `/journal/**`, `/hold/**`, `/compliance/**`, `/admin/**`):
1. Treasury Account & Double-Entry Journal View (`/account` & `/journal` with `Idempotency-Key` header tester).
2. 5-Hop MySQL Circular Fraud Graph Visualizer (`/compliance/graph/account/{accountId}`).
3. Gemini AI Investigation & MCP Human-in-the-Loop Approval Queue (`/compliance/investigations` & `PUT /compliance/approvals/id/{approvalId}`).
4. Admin AppCache Reload, Demo Ring Seeder & Kafka DLQ Replay View (`/admin/clear-app-cache`, `/admin/demo/seed-aml-ring`, `/admin/dlq`).
Run `npm run build` in `client/` and `./mvnw test` in `server/` to verify the complete full-stack application.
```