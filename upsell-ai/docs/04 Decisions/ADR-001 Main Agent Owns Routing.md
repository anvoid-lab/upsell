---
type: adr
title: Main Agent Owns Routing
status: accepted
updated: 2026-09-25
related:
  - "[[02 Architecture/Agent Boundaries]]"
  - "[[01 Backlog/Parallel Delivery Map]]"
---

# ADR-001 - Main Agent Owns Routing

## Context

The MVP needs direct CRUD/reporting operations and specialized sales reasoning,
but must avoid unnecessary model calls and rigid multi-agent workflows.

## Decision

The Main Agent remains the primary controller. It invokes common tools directly
and exposes the Sales Agent through `Agent.as_tool()`. The Sales Agent is called
only when the request requires sales reasoning. The Main Agent has no direct
Sales RAG access.

## Consequences

Simple requests remain low-latency and cheap. Sales capabilities have a clear
boundary and can evolve independently. Routing quality, capability descriptions,
and the direct-vs-sales E2E tests become important operational concerns.
