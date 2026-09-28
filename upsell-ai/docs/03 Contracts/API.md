---
type: contract
title: Copilot API Contract
updated: 2026-09-28
---

# Copilot API Contract

## Chat

`POST /v1/chat` accepts:

```yaml
conversation_id: string | null
messages: Message[]
metadata: Record<string, unknown>
```

The caller must provide `X-Tenant-Id`, `X-Actor-Id`, and
`X-Idempotency-Key`. `X-Customer-Id` is optional opaque context. Invalid JSON
or an invalid message returns a 400 structured error before the service runs.

Every result is an `AgentResponse`:

```yaml
run_id: string
type: answer | sales_copilot | approval | error
content: string | null
data: object | null
approval: object | null
error: ErrorDetail | null
```

For a successful request, middleware stores the final response under its
tenant-scoped idempotency key. A matching retry replays it. Reusing the key for
a different method, path, or body returns 400 `idempotency_conflict`.

Application errors are separate from the route response model:

```yaml
message: Invalid request
error:
  details: any
```

`AppException.json()` formats only this error JSON. Each route declares its
successful response through FastAPI's `response_model` parameter.

## Health

`GET /health` is public. It returns 200 when Redis and database are reachable
and 503 with `status: degraded` when either dependency is unavailable.
