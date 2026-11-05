# ADR-009: Zero-Downtime Database Schema Migration Strategy with Flyway

## Context
Financial databases must execute migrations across high availability clusters without locking core transaction tables or interrupting ledger settlement.

## Decision
Flyway SQL migrations apply backward-compatible additive changes (V1 through V9) with idempotent baseline verification and strict constraint naming.

## Status
Accepted and Implemented.
