---
type: architecture
title: Request Lifecycle and State
updated: 2026-09-28
---

# Request Lifecycle and State

```text
request
  -> authentication: RequestContext + TenantContext
  -> idempotency: replay | conflict | continue
  -> route boundary: validate body
  -> chat service: construct and mutate AgentContext
  -> MainAgentShell: Runner.run(agent, input, context=AgentContext)
  -> response mapping and successful-response cache
```

`AppContext` contains process-wide database and Redis clients. `RequestContext`
contains only the current request, its scoped tenant, run id, idempotency key,
and idempotency cache key. `AgentContext` is independent mutable runtime state
for the agent run and owns its own state mutations.

Authentication publishes the tenant scope once. `X-Customer-Id`, when present,
is only an opaque identifier. Phase 01 performs no customer lookup.

The idempotency middleware executes after authentication. It fingerprints the
method, path, and raw body; it caches only completed 2xx JSON responses through
the existing Redis adapter. Failed calls are not cached, so they can be retried.
