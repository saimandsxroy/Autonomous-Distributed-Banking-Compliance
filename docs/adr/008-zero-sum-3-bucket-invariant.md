# ADR-008: Zero-Sum 3-Bucket Balance Invariant Math Across Ledger Postings

## Context
Double-entry accounting requires exact balance conservation: every debit must be matched by an equal credit, and pending holds must preserve book value without creating or destroying funds.

## Decision
Every account maintains 3 balance buckets: `posted_balance = available_balance + held_balance`. Settle legs enforce `Σ debit.signed + credit.signed = 0.0000`.

## Status
Accepted and Implemented.
