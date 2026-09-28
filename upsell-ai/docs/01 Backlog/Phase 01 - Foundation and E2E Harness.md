---
type: phase
phase: 1
title: Foundation and E2E Harness
status: in_progress
priority: critical
depends_on: []
updated: 2026-09-28
---

# Phase 01 - Foundation and E2E Harness

## Objective

Create the executable HTTP and agent-runtime foundation for later features. The
phase owns one authenticated conversation turn, request-scoped identity,
idempotent replay, a shared mutable `AgentContext`, and one Main Agent run
through the OpenAI Agents SDK.

It does not own customer lookup, business or product persistence, product
catalogue tools, RAG, approvals, schedules, or stored files.

## Owned journey

`POST /v1/chat` -> authentication publishes `TenantContext` and
`RequestContext` -> idempotency middleware replays or permits the request ->
the chat service creates `AgentContext` -> the context mutates through its own
methods -> Main Agent runs through `Runner.run()` -> the structured response is
returned and a completed success is available for replay.

`X-Customer-Id` is an optional opaque value in `TenantContext`. It is read-only
and has no persistence lookup in this phase.

## Deliverables

- [x] FastAPI composition root, application-scoped Redis/database clients, and
  public health endpoint
- [x] Request-scoped tenant, actor, optional customer, run, and idempotency data
- [x] Typed conversation, message, media, agent context, response, and error
  contracts
- [x] Mutable `AgentContext` fields for conversation id, messages, runtime
  state, and final response
- [x] Main Agent executed with the Agents SDK runner and a deterministic
  capability with no sales/RAG access
- [x] URL-only image and file inputs translated to SDK input items
- [x] Middleware idempotency replay and conflict handling through Redis
- [x] Unit coverage for context mutation, media translation, request scope,
  replay, conflict handling, and health
- [ ] Live smoke verification against the configured model provider

## Rules

- `TenantContext` owns request identity. `AgentContext` owns mutable agent-run
  state; it does not mirror tenant/customer/product data.
- Message media may be forwarded to the model as conversation input. It helps
  the LLM understand the message and is independent from products, which later
  phases retrieve through tools.
- `RequestContext` owns the idempotency key and its tenant-scoped cache key.
  The idempotency middleware stores successful response snapshots only.
- Existing migrations and persistence contracts remain available for later
  phases, but they are not part of this phase's runtime journey.

## Acceptance criteria

- A valid scoped request reaches the SDK runner and receives an `AgentResponse`.
- Reusing an idempotency key with the identical method, path, and body returns
  the first completed response; changing that request returns
  `idempotency_conflict`.
- A message can contain text, links, image URLs, and file URLs; no media bytes
  are stored by this service.
- `/health` is public and reports the availability of both application-scoped
  dependencies.
- The Main Agent exposes no Sales Agent, RAG, product, approval, or scheduling
  capability.
