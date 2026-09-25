---
type: phase
phase: 1
title: Foundation and E2E Harness
status: planned
priority: critical
depends_on: []
updated: 2026-09-25
related:
  - "[[02 Architecture/Overview]]"
  - "[[02 Architecture/Agent Boundaries]]"
  - "[[02 Architecture/Persistence and Context]]"
  - "[[02 Architecture/Redis Context Cache]]"
  - "[[02 Architecture/Testing Strategy]]"
  - "[[03 Contracts/Agent Context]]"
  - "[[03 Contracts/API]]"
  - "[[03 Contracts/Agent Runtime]]"
  - "[[04 Decisions/ADR-001 Main Agent Owns Routing]]"
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

`POST /v1/copilot/runs` with a minimal request -> the application resolves the
customer context through Redis -> a cache miss loads trusted data and warms the
cache -> Main Agent receives the shared `AgentContext` -> a deterministic test
capability is selected -> the shared `AgentResponse` is returned.

## Deliverables

- [ ] FastAPI application boundary and health/configuration checks
- [ ] Tenant, actor, request, and runtime correlation identifiers
- [ ] Typed `ConversationRequest`, `Message`, `AgentContext`, and `AgentResponse`
- [ ] Shared Customer, Business, and Product contracts
- [ ] Database foundation for customers, products, and expanded business context
- [ ] Redis service in Docker Compose for shared agent context
- [ ] Typed cache adapter with get, set, refresh, and invalidate operations
- [ ] Stable cache key and TTL policy shared by all later phases
- [ ] Main Agent shell with no direct Sales knowledge-base access
- [ ] Tool registry and capability metadata boundary
- [ ] Relational + JSONB persistence boundary
- [ ] Deterministic policy interface that can deny an action
- [ ] E2E test foundation in `tests/e2e/smoke.py` hitting real endpoints with real data
- [ ] Trace/run correlation identifiers and safe logging rules

## Backlog

- [ ] Implement the approved Pydantic contracts and version them under `v1`
- [ ] Add the approved business columns with nullable JSONB context fields and explicit locale defaults
- [ ] Add customer and product persistence required by the shared `AgentContext`
- [ ] Store product price as fixed-precision decimal and stock as a non-negative integer
- [ ] Add Redis to Docker Compose with a health check
- [ ] Configure `REDIS_URL` and context TTL through environment settings
- [ ] Key customer context by `business_id` and `customer_id`
- [ ] Load customer and business data on cache miss and update context after each turn
- [ ] Exclude authoritative price and stock from long-lived cached state
- [ ] Define repository interfaces before choosing implementation details
- [ ] Define how SDK `RunState` snapshots are stored as trusted server data
- [ ] Define idempotency and retry semantics for run creation
- [ ] Add a no-LLM deterministic capability for the first green smoke test
- [ ] Prove tenant isolation and absence of RAG access from Main Agent tools
- [ ] Document local and CI commands for the full E2E suite

## Acceptance criteria

- [ ] A clean checkout can run the API and the complete E2E harness
- [ ] A request receives a stable structured response
- [ ] Main Agent, Sales Agent, and tools share the same `AgentContext` and `AgentResponse`
- [ ] Business defaults are consistent between PostgreSQL and Pydantic validation
- [ ] Nullable business JSONB fields round-trip as `null` without becoming empty objects
- [ ] Repeated customer requests reuse the Redis context without reloading unchanged customer data
- [ ] A cache miss reconstructs the same context from trusted persistence
- [ ] Cache keys cannot expose or mix context between businesses
- [ ] All later phases can use the cache adapter without defining their own Redis integration
- [ ] Main Agent tool configuration contains no Sales knowledge-base capability
- [ ] A policy denial is represented as a structured result, not an LLM decision
- [ ] Later phases can add tools, RAG, approvals, or jobs without changing the base envelope

## Blockers

None. This is the only shared prerequisite for the feature phases.

## Execution notes

The foundation is deliberately capability-neutral. Redis configuration and the
cache adapter belong here so feature phases can work in parallel against the
same context boundary. Durable run, action, and approval tables remain deferred.
