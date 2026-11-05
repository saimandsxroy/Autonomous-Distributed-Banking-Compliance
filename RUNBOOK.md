# FourEyes SRE Production Runbook & Operations Guide

## 1. System Invariants
- **Double-Entry Ledger Equation**: `Book Value (Posted) = Available + Held (Encumbered)`
- **Zero-Sum Postings**: `Debit Leg + Credit Leg = $0.0000` on all settled transactions.
- **Lock Ordering**: All transfers acquire row-level locks via `SELECT ... FOR UPDATE` ordered strictly by `min(src, dst)` then `max(src, dst)` to eliminate deadlocks.

## 2. Recovery Procedures
- **Redis Lua Outage**: Idempotency gracefully falls open to MySQL durable records.
- **Kafka Outage**: MySQL Transactional Outbox queues events using `SKIP LOCKED` until brokers recover.
- **Unreachable AI Detective**: High-precision local heuristic rules immediately triage AML holds without downtime.
