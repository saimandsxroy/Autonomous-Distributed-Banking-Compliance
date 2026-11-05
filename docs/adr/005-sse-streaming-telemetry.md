# ADR-005: Asynchronous SSE Streaming Telemetry for Operational Monitoring

## Context
Real-time dashboard updates and AML investigation statuses require low-overhead bidirectional or unidirectional updates without polling fatigue.

## Decision
Spring WebMvc `SseEmitter` delivers sub-second operational events (`HOLD_FLAGGED`, `HITL_RESOLVED`, `VELOCITY_ALERT`) to all subscribed compliance consoles.

## Status
Accepted and Implemented.
