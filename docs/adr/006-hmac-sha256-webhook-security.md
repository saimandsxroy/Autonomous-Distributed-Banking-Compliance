# ADR-006: Cryptographic HMAC-SHA256 Signature Verification for Inbound Webhooks

## Context
External banking partners and payment networks dispatch settlement webhooks that must be authenticated against replay and tampering.

## Decision
Each webhook header `X-Signature-SHA256` is verified against HMAC-SHA256 of the raw payload, coupled with a 300-second timestamp freshness gate and unique `event_id` idempotency deduplication.

## Status
Accepted and Implemented.
