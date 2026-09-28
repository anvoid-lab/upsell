---
type: architecture
title: Redis Cache
updated: 2026-09-28
---

# Redis Cache

`RedisCacheManager` remains the single generic JSON cache adapter. It provides
get, set, refresh, invalidate, and ping without knowing customer, product, or
agent domain concepts.

Phase 01 uses it for idempotency only. `RequestContext` creates the scoped key:
`idempotency:{tenant_id}:{idempotency_key}`. The idempotency middleware stores a
fingerprint and a completed successful response with `IDEMPOTENCY_TTL_SECONDS`.
The cache contains no downloaded media or product data.
