---
type: phase
phase: 5
title: Scheduled Follow-ups
status: planned
priority: medium
depends_on:
  - "[[01 Backlog/Phase 01 - Foundation and E2E Harness]]"
updated: 2026-09-25
related:
  - "[[02 Architecture/Persistence and Context]]"
  - "[[03 Contracts/Agent Context]]"
---

# Phase 05 - Scheduled Follow-ups

## Objective

Run due follow-ups outside the active request and agent process, using shared
lead context and deterministic eligibility rules.

## Owned E2E journey

Follow-up becomes due -> worker claims it idempotently -> worker loads current
context -> Sales Agent recommends an action -> deterministic policy verifies that
the action is allowed without approval -> action is sent/returned once -> schedule
and outcome are updated.

## Deliverables

- [ ] Follow-up schedule and job records built from the shared `AgentContext`
- [ ] Worker/queue adapter boundary
- [ ] Claim, retry, lease, and idempotency behavior
- [ ] Eligibility and quiet-hour rules outside the LLM
- [ ] Deterministic rejection of follow-ups that would require deferred approval

## Acceptance criteria

- [ ] No process remains alive while waiting for a due time
- [ ] Duplicate worker delivery cannot duplicate the external action
- [ ] Stale, opted-out, or ineligible leads are skipped deterministically
- [ ] Follow-ups that require approval are not executed in the current MVP
- [ ] E2E tests cover due, retry, skip, policy denial, and duplicate-delivery paths

## Blockers

Only [[01 Backlog/Phase 01 - Foundation and E2E Harness]].

## Execution notes

The worker may use the Sales Agent, but this phase remains independently testable
with fake scheduler and channel adapters.
