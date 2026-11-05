# ADR-003: Redis Lua Velocity Limiting with Durable MySQL Outbox Pattern

## Context
High-frequency transaction fraud requires sub-millisecond atomic velocity checking without losing durable events when messaging brokers encounter network jitter.

## Decision
Atomic sliding window rate checks execute via Redis Lua script in ~0.4ms. Event publication writes to a local MySQL transactional outbox table within the same ACID transaction, polled via `SKIP LOCKED` by background virtual threads.

## Status
Accepted and Implemented.
