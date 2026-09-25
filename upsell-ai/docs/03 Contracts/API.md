---
type: contract
title: Copilot API Contract
updated: 2026-09-25
related:
  - "[[01 Backlog/Phase 01 - Foundation and E2E Harness]]"
  - "[[03 Contracts/Agent Runtime]]"
  - "[[03 Contracts/Agent Context]]"
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

## Create request

`POST /v1/copilot/runs` receives a `ConversationRequest`.

Durable run reads and approval-resumption endpoints are deferred from the current
MVP. Their response shapes remain reserved for future use.

## Error behavior

Errors use a stable code, human-safe message, trace identifier, and optional
field details. Internal prompts, tool arguments, credentials, and raw provider
errors are never returned directly.

```yaml
code: string
message: string
retryable: boolean
field_errors: Record<string, string[]>
```
