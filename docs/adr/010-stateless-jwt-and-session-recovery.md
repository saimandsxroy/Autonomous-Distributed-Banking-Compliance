# ADR-010: Stateless JWT Authentication with Demo Persona Auto-Recovery

## Context
15-minute token expirations cause disruptions for interactive compliance demonstrations and automated integration test runs.

## Decision
The frontend API client intercepts HTTP 401 Unauthorized responses and seamlessly re-mints valid HS256 tokens via `/auth/demo-switch/{persona}`, replaying the request once transparently.

## Status
Accepted and Implemented.
