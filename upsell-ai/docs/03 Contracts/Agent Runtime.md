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

The runtime uses Redis-backed context for continuity between short-lived runs.
Durable SDK `RunState` snapshots and database-backed approval resumption are
deferred from the current MVP.
