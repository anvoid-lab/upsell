---
type: contract
title: Approval and Action Contract
status: deferred
updated: 2026-09-25
related:
  - "[[02 Architecture/Persistence and Context]]"
  - "[[01 Backlog/Phase 04 - Human Approval and Governed Actions]]"
  - "[[04 Decisions/ADR-002 Defer Durable Agent Execution Persistence]]"
---

# Approval and Action Contract

This contract is reserved for future re-evaluation and is not part of the current
MVP implementation scope.

An action is a proposed or executed side effect with an immutable `action_id`,
type, tenant, actor, target, policy decision, status, and idempotency key.

Action statuses are `proposed`, `approved`, `rejected`, `executing`, `completed`,
`failed`, `expired`, or `canceled`. Approval is required by deterministic policy
for discounts, exceptional commercial conditions, sensitive external actions,
irreversible operations, and configured business rules.

Approval records include reviewer, decision, optional edited parameters,
concurrency token, timestamps, and audit metadata. Editing never bypasses the
policy check; the edited action is revalidated before execution.

An action executor must be idempotent and must not run when policy denies it.
