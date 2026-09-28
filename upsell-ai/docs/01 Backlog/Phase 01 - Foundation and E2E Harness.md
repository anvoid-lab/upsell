---
type: phase
phase: 1
title: Foundation and E2E Harness
status: implemented
priority: critical
depends_on: []
updated: 2026-09-25
related:
    - "[[02 Architecture/Overview]]"
    - "[[02 Architecture/Agent Boundaries]]"
    - "[[02 Architecture/Persistence and Context]]"
    - "[[02 Architecture/Redis Context Cache]]"
    - "[[02 Architecture/Request Lifecycle and State]]"
    - "[[02 Architecture/Repository Boundary]]"
    - "[[02 Architecture/Testing Strategy]]"
    - "[[03 Contracts/Agent Context]]"
    - "[[03 Contracts/API]]"
    - "[[03 Contracts/Agent Runtime]]"
    - "[[04 Decisions/ADR-001 Main Agent Owns Routing]]"
    - "[[04 Decisions/ADR-004 Errors Are Declared, Not Built In Place]]"
    - "[[04 Decisions/ADR-005 One Tenant Context Per Request]]"
    - "[[04 Decisions/ADR-006 Dependencies Are Declared, Not Constructed]]"
    - "[[04 Decisions/ADR-007 A Feature Is One Folder]]"
    - "[[04 Decisions/ADR-008 The Repository Owns Persistence Rules]]"
---

# Phase 01 - Foundation and E2E Harness

## Objective

Create the smallest executable foundation that makes all later feature phases
independently implementable: one FastAPI entry point, stable request/result
contracts, agent boundary, persistence boundary, configuration, deterministic
policy boundary, and a repeatable E2E test harness.

This phase must not implement sales reasoning, RAG, approvals, or scheduled
follow-ups as product features.

## Owned E2E journey

`POST /v1/chat` with a minimal request -> the application resolves the
customer context through Redis -> a cache miss loads trusted data and warms the
cache -> Main Agent receives the shared `AgentContext` -> a deterministic test
capability is selected -> the shared `AgentResponse` is returned.

## Deliverables

- [x] FastAPI application boundary and health/configuration checks
- [x] Tenant, actor, request, and runtime correlation identifiers
- [x] Typed `ConversationRequest`, `Message`, `AgentContext`, and `AgentResponse`
- [x] Shared Customer, Business, and Product contracts
- [x] Database foundation for customers, products, and expanded business context
- [x] Redis service in Docker Compose for shared agent context
- [x] Typed cache adapter with get, set, refresh, and invalidate operations
- [x] Stable cache key and TTL policy shared by all later phases
- [x] Main Agent shell with no direct Sales knowledge-base access
- [x] Tool registry and capability metadata boundary
- [x] Relational + JSONB persistence boundary
- [x] Deterministic policy interface that can deny an action
- [x] E2E test foundation in `tests/e2e/smoke.py` hitting real endpoints with real data
- [x] Trace/run correlation identifiers and safe logging rules

## Backlog

- [x] Implement the approved Pydantic contracts and version them under `v1`
- [x] Add the approved business columns with nullable JSONB context fields and explicit locale defaults
- [x] Add customer and product persistence required by the shared `AgentContext`
- [x] Store product price as fixed-precision decimal and stock as a non-negative integer
- [x] Add Redis to Docker Compose with a health check
- [x] Configure `REDIS_URL` and context TTL through environment settings
- [x] Key customer context by `tenant_id` and `customer_id`
- [x] Tenant identity arrives as `X-Tenant-Id` and maps to `businesses.id`
- [x] Load customer and business data on cache miss and update context after each turn
- [x] Exclude authoritative price and stock from long-lived cached state
- [x] Define repository interfaces before choosing implementation details
- [x] Define how SDK `RunState` snapshots are stored as trusted server data
- [x] Define idempotency and retry semantics for run creation
- [x] Add a no-LLM deterministic capability for the first green smoke test
- [x] Prove tenant isolation and absence of RAG access from Main Agent tools
- [x] Document local and CI commands for the full E2E suite

Run-state storage is defined as a reserved `state.run_state` slot inside the
shared `AgentContext`, written only by application code and cached with the
context. Durable snapshot tables stay deferred by
[[04 Decisions/ADR-002 Defer Durable Agent Execution Persistence]].

For 2026-09-25, the CI command in the README is the same pytest command used
locally. No CI workflow file exists yet, because the pipeline provider is not part
of this phase's approved scope.

## Acceptance criteria

- [x] A clean checkout can run the API and the complete E2E harness
- [x] A request receives a stable structured response
- [x] Main Agent, Sales Agent, and tools share the same `AgentContext` and `AgentResponse`
- [x] Business defaults are consistent between PostgreSQL and Pydantic validation
- [x] Nullable business JSONB fields round-trip as `null` without becoming empty objects
- [x] Repeated customer requests reuse the Redis context without reloading unchanged customer data
- [x] A cache miss reconstructs the same context from trusted persistence
- [x] Cache keys cannot expose or mix context between businesses
- [x] All later phases can use the cache adapter without defining their own Redis integration
- [x] Main Agent tool configuration contains no Sales knowledge-base capability
- [x] A policy denial is represented as a structured result, not an LLM decision
- [x] Later phases can add tools, RAG, approvals, or jobs without changing the base envelope

The shared-envelope criterion covers the Main Agent and every tool today. The
Sales Agent consumes the same `AgentResponse` in
[[01 Backlog/Phase 03 - Sales Reasoning and Knowledge Base]]; the envelope has no
agent-specific variant to add.

## Blockers

None. This is the only shared prerequisite for the feature phases.

## Execution notes

The foundation is deliberately capability-neutral. Redis configuration and the
cache adapter belong here so feature phases can work in parallel against the
same context boundary. Durable run, action, and approval tables remain deferred.

Supabase is the sibling project `../supabase`, linked by `upsell-ai.code-workspace`
and [[05 Workspace/External Projects]]. Clients for Supabase and Redis live in
`lib/`; schema changes are migrations in the sibling project. Tenant identity is
the `X-Tenant-Id` header and maps to `businesses.id`.

### Implementation status 2026-09-26

Implemented and verified:

- Contracts live in `core/contracts/**.py` and are validated at the route
  boundary by `app/api/validators.py`, declared per route as a dependency.
  `app/main.py` is the composition root and `app/api/chat/chat_service.py` owns
  the conversation journey.
- `app/api/<feature>/` groups the routes and services of one feature, per
  [[04 Decisions/ADR-007 A Feature Is One Folder]]. Cross-cutting request
  concerns live in `app/api/middlewares/`, described in
  [[02 Architecture/Request Lifecycle and State]].
- `TenantContext` is produced only by authentication and reaches services and
  repositories as a declared dependency,
  [[04 Decisions/ADR-005 One Tenant Context Per Request]].
- `AppException` is the only way to fail, carries the response mapping, and logs
  itself, [[04 Decisions/ADR-004 Errors Are Declared, Not Built In Place]].
- `lib/cache` and `lib/database` are the only modules that touch Redis and
  Supabase. Services read tables through one generic repository that implements
  the full create, read, update, and delete set,
  [[02 Architecture/Repository Boundary]].
- The migration `../supabase/migrations/20260925230000_copilot_foundation.sql`
  extends `businesses` and adds `customers` and `products`.
- `tests/unit` covers the tenant and trace middleware, body contract
  validation, the error contract and its statuses, the tenant context, the
  repository rules and its write operations, and a whole conversation turn
  resolved through the real routes with deterministic fakes.
- `tests/e2e/smoke.py` covers health, the structured response, cache reuse with
  authoritative price and stock excluded, idempotent replay, idempotency
  conflict, missing tenant, missing actor, invalid request, message validation,
  and tenant isolation.

Verification runs, 2026-09-25: 16 unit tests passed, and the smoke suite passed
three times (9 tests each) against a real stack — the API over real Redis and a
real PostgreSQL reached through PostgREST, with the five migrations applied in
order. Exact decimal scale survived the read path (`Decimal("2500.00")`), and
inactive or soft-deleted products were excluded. A soft-deleted business is
reported as `not_found`, and a corrupted, wrongly shaped, or non-object cached
context is discarded and rebuilt from persistence with a 200 response.

Verification run, 2026-09-26: 52 unit tests pass after the boundary refactor, and
the whole application boots with the routes, middleware, and OpenAPI schema
resolved. The smoke suite has not been re-run against a real stack since the
entry point moved from `/v1/copilot/runs` to `/v1/chat`.

Remaining before the phase is closed on the linked project: apply the migration
to that project and run the same smoke suite against it with real
`SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and seeded business, customer, and product
rows. The API starts and reports `degraded` on `/health` when the secret key is
absent, instead of failing at startup.
