---
type: planning
title: Parallel Delivery Map
updated: 2026-09-25
related:
  - "[[01 Backlog/Phase 01 - Foundation and E2E Harness]]"
  - "[[00 Home/Index]]"
---

# Parallel Delivery Map

## Dependency rule

```text
Phase 01 - Foundation and E2E Harness
                    |
    +---------------+----------------+----------------+----------------+
    |               |                |                |                |
 Phase 02        Phase 03         Phase 04         Phase 05         Phase 06
 Direct Ops      Sales/RAG        Deferred         Follow-ups       Hardening
```

Every feature phase consumes only the contracts and fixtures established in
Phase 01. Shared changes after Phase 01 must be additive and versioned; they
must not become informal dependencies between feature teams.

## Parallel workstreams

| Phase | Owns | Must not own |
| --- | --- | --- |
| 02 | Main Agent direct tools and CRUD | Sales reasoning, RAG, approvals |
| 03 | Sales Agent and pgvector retrieval | Direct Main Agent CRUD, scheduling |
| 04 | Deferred HITL, pause/resume, and audit scope | Current MVP delivery |
| 05 | Worker, schedules, retries, due actions | Long-lived agent processes |
| 06 | Traces, evaluation, budgets, hardening | New product capabilities |

## Integration rule

Each phase must ship a vertical E2E test using fake adapters first. Integration
with real OpenAI, Supabase, channel, or scheduler services is an adapter concern
and must not be required to validate the phase's core behavior.
