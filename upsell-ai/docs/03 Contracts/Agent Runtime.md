---
type: contract
title: Agent Runtime Contract
updated: 2026-09-25
related:
  - "[[02 Architecture/Agent Boundaries]]"
  - "[[03 Contracts/API]]"
---

# Agent Runtime Contract

The runtime receives [[03 Contracts/Agent Context|AgentContext]] and returns the
shared `AgentResponse` defined in [[03 Contracts/API]].
Main Agent and Sales Agent never introduce separate response envelopes.

Common tools advertise explicit capability names and schemas. The Main Agent can
select them based on intent, but every invocation is still validated and
authorized by application code.

For `type: "sales_copilot"`, `response.data` follows
[[03 Contracts/Sales Agent Output|SalesAgentResponse]]. It includes recommendation,
rationale summary, sales stage, confidence/uncertainty, evidence references, and
an optional proposed action. It must distinguish known trusted facts from model
inference.

`AgentContext` is mutable local state for one `Runner.run()` execution. Redis is
not the conversation-memory owner in Phase 01; it stores idempotent response
snapshots through `RequestContext`. Durable SDK `RunState` snapshots and
database-backed approval resumption are deferred from the current MVP.
