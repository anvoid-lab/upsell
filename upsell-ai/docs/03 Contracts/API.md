---
type: contract
title: Copilot API Contract
updated: 2026-09-26
related:
  - "[[01 Backlog/Phase 01 - Foundation and E2E Harness]]"
  - "[[02 Architecture/Request Lifecycle and State]]"
  - "[[04 Decisions/ADR-004 Errors Are Declared, Not Built In Place]]"
  - "[[04 Decisions/ADR-005 One Tenant Context Per Request]]"
  - "[[03 Contracts/Agent Context]]"
  - "[[03 Contracts/Agent Runtime]]"
---

# Copilot API Contract

The MVP API is versioned under `/v1`. It accepts [[03 Contracts/Agent Context|ConversationRequest]]
and returns the same `AgentResponse` envelope for Main Agent, Sales Agent,
approvals, and errors.

## AgentResponse

```yaml
request_id: string
run_id: string
type: answer | sales_copilot | approval | error
content: string | null
data: SalesAgentResponse | null
approval: Approval | null
error: ErrorDetail | null
```

Every response includes every key. `type` and `content` are always present even
when `content` is `null`.

- `answer` requires `content`.
- `sales_copilot` requires `data`.
- `approval` requires `approval` and may also carry the related `data`.
- `error` requires `error`.

There is no components array and no separate Main Agent or Sales Agent response
format.

## Create turn

`POST /v1/chat` receives a `ConversationRequest` and returns the
`AgentResponse` envelope. A `conversation_id` that is `null` starts a
conversation; a value continues the existing one.

Tenant and actor are not part of the body. They arrive as the `X-Tenant-Id` and
`X-Actor-Id` headers. `X-Tenant-Id` maps to `businesses.id` in the sibling
Supabase project. Both are required, and a request that carries neither is
rejected before any domain work runs, per
[[04 Decisions/ADR-005 One Tenant Context Per Request]].

The route declares the body contract as a dependency, so a body that is not valid
JSON, is not a JSON object, or does not satisfy `ConversationRequest` is
rejected with status 400 and an `AgentResponse` of `type: error`, without
executing the service.

## Health

`GET /health` is public and needs no tenant. It answers 200 with `status: ok`
when both dependencies answer, and 503 with `status: degraded` otherwise, so a
probe can tell a wrong answer from no answer.

```yaml
status: ok | degraded
redis: ok | unavailable
database: ok | unavailable
```

## Error behavior

Errors use a stable code, human-safe message, retryable flag, and optional field
details. Internal prompts, tool arguments, credentials, and raw provider errors
are never returned directly.

```yaml
code: string
message: string
retryable: boolean
field_errors: Record<string, string[]>
```

Every response carries the trace identifier in the `X-Trace-Id` header. A
non-retryable error is `400`. A retryable error, such as an unavailable
dependency, is `503`, so callers can retry safely. Successful runs are `200`.

Durable turn reads and approval-resumption endpoints are deferred from the
current MVP. Their response shapes remain reserved for future use.
