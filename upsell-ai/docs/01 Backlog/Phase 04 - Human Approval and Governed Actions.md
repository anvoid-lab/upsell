---
type: phase
phase: 4
title: Human Approval and Governed Actions
status: deferred
priority: high
depends_on:
  - "[[01 Backlog/Phase 01 - Foundation and E2E Harness]]"
updated: 2026-09-25
related:
  - "[[03 Contracts/Approval and Action]]"
  - "[[03 Contracts/API]]"
  - "[[02 Architecture/Persistence and Context]]"
  - "[[04 Decisions/ADR-002 Defer Durable Agent Execution Persistence]]"
---

# Phase 04 - Human Approval and Governed Actions

## Objective

Pause sensitive actions for review and resume them safely after approval,
rejection, or permitted editing. Deterministic business rules always decide what
is allowed; the model can only recommend.

## Owned E2E journey

Sales recommendation proposes a discount or external action -> policy engine
requires approval -> run is paused and persisted -> reviewer approves, rejects,
or edits -> original run resumes exactly once -> final action/result is recorded.

## Deliverables

- [ ] Approval policy and action classification
- [ ] Pending approval API/read model
- [ ] Approval responses composed through the shared `AgentResponse`
- [ ] Trusted `RunState` persistence and resume path
- [ ] Approval, rejection, edit, expiry, and replay protections
- [ ] Audit record for decision and resulting side effect

## Acceptance criteria

- [ ] Normal low-risk requests never pause for approval
- [ ] `type: approval` always contains an approval object and may preserve related Sales Agent data
- [ ] Discounts, exceptional terms, and sensitive external actions pause when policy requires
- [ ] Rejection prevents the side effect and returns a useful reason
- [ ] Resumption does not lose context or duplicate a tool side effect
- [ ] Untrusted client-submitted run snapshots are never resumed

## Blockers

Deferred until the MVP requires durable pause/resume, auditable external actions,
or production human approval.

## Execution notes

The contract remains documented, but `agent_runs`, `agent_actions`, and
`agent_approvals` are intentionally outside the current implementation scope.
