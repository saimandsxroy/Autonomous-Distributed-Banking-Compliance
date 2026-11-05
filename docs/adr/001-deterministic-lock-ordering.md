# ADR-001: Deterministic Ascending Lock Ordering for Ledger Invariants

## Context
Concurrent bidirectional transfers between two accounts (A -> B and B -> A) can produce database deadlocks if accounts are locked in order of transfer leg initiation.

## Decision
All transactional ledger mutations order row-level locking strictly by `Math.min(src, dst)` followed by `Math.max(src, dst)` via `SELECT ... FOR UPDATE`.

## Status
Accepted and Implemented.
