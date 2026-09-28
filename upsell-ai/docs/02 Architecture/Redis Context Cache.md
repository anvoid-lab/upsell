---
type: architecture
title: Redis Context Cache
updated: 2026-09-25
related:
  - "[[01 Backlog/Phase 01 - Foundation and E2E Harness]]"
  - "[[03 Contracts/Agent Context]]"
  - "[[02 Architecture/Persistence and Context]]"
---

# Redis Context Cache

Redis stores the shared `AgentContext` between customer requests so later turns
do not reload unchanged customer and business data from PostgreSQL.

## Flow

```text
Request
  -> read agent_context:{tenant_id}:{customer_id}
  -> hit: use cached context and refresh price and stock from PostgreSQL
  -> miss: load trusted data from the sibling Supabase project and warm the cache
  -> run agent
  -> refresh context after the turn
```

The cached value may contain customer data, business data, recent messages,
summary, runtime state, and the last response. PostgreSQL remains authoritative.
Price and stock must be refreshed before a recommendation or external action;
they must not rely on long-lived cached values.

Redis runs as a Docker Compose service from Phase 01. Configuration lives in
`core/config.py` (module-level `REDIS_URL`, `CONTEXT_TTL_SECONDS`,
`IDEMPOTENCY_TTL_SECONDS`) with an explicit TTL. Cache keys always include
`tenant_id` and `customer_id` to preserve tenant isolation. The API receives that
tenant as `X-Tenant-Id` and it maps to `businesses.id` in the sibling Supabase
project. Redis is reached only through `lib/cache`.

The cache is disposable. A miss or Redis restart must rebuild the context from
trusted persistence without changing agent behavior.
