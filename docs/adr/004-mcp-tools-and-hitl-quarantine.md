# ADR-004: Model Context Protocol (MCP) Tools and Human-in-the-Loop AML Quarantine

## Context
Autonomous AI models must not have unchecked write authorization to move or freeze institutional funds without human compliance sign-off.

## Decision
AI agents operate strictly through Model Context Protocol (MCP) tools that propose actions (`proposeReleaseHold`, `proposeFreezeAndReverseHold`). State changes remain pending until signed off by a supervisory compliance officer.

## Status
Accepted and Implemented.
