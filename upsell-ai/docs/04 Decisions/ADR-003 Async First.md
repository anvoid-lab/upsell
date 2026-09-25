---
type: decision
title: "ADR-003: Async First"
status: accepted
updated: 2026-09-25
related:
  - "[[02 Architecture/Overview]]"
  - "[[01 Backlog/Phase 01 - Foundation and E2E Harness]]"
---

# ADR-003: Async First

## Decision

All application code must be async wherever the language and framework support
it. This includes FastAPI route handlers, application services, repository
methods, cache adapters, agent tools, and background workers.

## Rationale

The OpenAI Agents SDK, Supabase client, and Redis client all expose async
interfaces. Mixing sync and async code forces thread-pool workarounds, increases
latency, and makes the concurrency model harder to reason about.

FastAPI is designed for async-first usage. Running blocking code in async
handlers stalls the event loop and degrades throughput under concurrent requests.

## Rules

- Define all route handlers, service methods, and repository functions with `async def`.
- Define all `@function_tool` callbacks with `async def` (as enforced by the factory in `crud_tool.py`).
- Never call blocking I/O (database, HTTP, cache) from a sync function inside an async context.
- If a third-party function has no async variant and cannot be avoided, wrap it
  with `asyncio.to_thread` and document the reason.

## Exceptions

Pure computation helpers with no I/O (validators, formatters, pure transforms)
may use `def` where `async def` adds no value.
