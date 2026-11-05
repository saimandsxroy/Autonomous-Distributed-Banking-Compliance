# ADR-002: Dual-Control Maker-Checker Separation of Duties under FINRA 3110

## Context
FINRA Rule 3110 prohibits financial transactions from being initiated and approved by the same supervisory party or interested account owner.

## Decision
Wire spend desk enforces distinct maker and checker roles, verifying the approving officer does not own either source or destination account.

## Status
Accepted and Implemented.
