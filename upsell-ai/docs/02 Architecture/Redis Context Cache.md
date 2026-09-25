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
  -> read agent_context:{business_id}:{customer_id}
  -> hit: use cached context
  -> miss: load trusted data from PostgreSQL and warm the cache
  -> run agent
  -> refresh context after the turn
```

The cached value may contain customer data, business data, recent messages,
summary, runtime state, and the last response. PostgreSQL remains authoritative.
Price and stock must be refreshed before a recommendation or external action;
they must not rely on long-lived cached values.

Redis runs as a Docker Compose service from Phase 01. Configuration uses
`REDIS_URL` and an explicit TTL. Cache keys always include `business_id` and
`customer_id` to preserve tenant isolation.

The cache is disposable. A miss or Redis restart must rebuild the context from
trusted persistence without changing agent behavior.
