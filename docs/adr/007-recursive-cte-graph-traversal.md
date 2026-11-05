# ADR-007: Multi-Hop Graph Recursive CTE Cycle Traps for Fraud Rings

## Context
Launderers structure transactions across multi-hop circular loops (A -> B -> C -> A) to obfuscate origins.

## Decision
MySQL 8.0 `WITH RECURSIVE` Common Table Expressions (CTE) trace inbound and outbound counterparties up to 5 hops deep within single queries, tagging closed cycles before funds leave escrow.

## Status
Accepted and Implemented.
