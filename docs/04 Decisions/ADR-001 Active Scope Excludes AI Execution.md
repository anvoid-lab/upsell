---
type: decision
title: ADR-001 Active Scope Excludes AI Execution
status: accepted
date: 2026-09-15
updated: 2026-09-15
related:
  - "[[02 Architecture/Overview]]"
  - "[[01 Backlog/Phase 03 - Sales Copilot Definition]]"
---

# ADR-001 - Active Scope Excludes AI Execution

## Context

Older product and strategy notes describe AI-generated follow-ups, RAG, suggestions,
and autonomous sales workflows. The current implemented web application and active
backlog explicitly state that AI execution, queues, embeddings, and related backend
infrastructure have been removed from live scope.

## Decision

Treat AI execution as out of current implemented scope. Preserve only inert UI traces
and future-facing conceptual notes until a new Sales Copilot contract is formally
defined and approved.

## Positive consequences

- Documentation matches the implemented product
- Near-term delivery stays focused on the real inbox journey
- The team avoids implying capabilities that do not exist in production

## Negative consequences

- Historical commercial docs become partially misleading until rewritten
- Follow-up concepts now span a gap between stored data and active product behavior

## Alternatives considered

- Re-enable AI-related UI and backend paths incrementally
- Keep AI language in primary docs and treat missing behavior as temporary
