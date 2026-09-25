---
type: phase
phase: 6
title: Evaluation and Production Hardening
status: planned
priority: medium
depends_on:
  - "[[01 Backlog/Phase 01 - Foundation and E2E Harness]]"
updated: 2026-09-25
related:
  - "[[02 Architecture/Overview]]"
  - "[[03 Contracts/Agent Runtime]]"
---

# Phase 06 - Evaluation and Production Hardening

## Objective

Make the MVP observable, measurable, safe to operate, and ready for controlled
real-world usage across all independent feature slices.

## Owned E2E journey

A representative golden scenario runs from request to result/action -> trace,
cost, latency, policy, and tool events are correlated -> evaluator checks routing,
grounding, and safety -> failures are diagnosable without exposing secrets.

## Deliverables

- [ ] Tracing and structured operational metrics
- [ ] Golden E2E dataset and regression suite
- [ ] Latency/token/error budgets
- [ ] Prompt and tool version metadata
- [ ] Redaction, retention, and incident runbook
- [ ] Load and failure-injection tests for workers and persistence

## Acceptance criteria

- [ ] Every run can be traced from API request to tool/action outcome
- [ ] Direct operational requests do not incur unnecessary Sales Agent calls
- [ ] Sales answers are evaluated for grounding and unsupported claims
- [ ] HITL and worker failures have recoverable, observable states
- [ ] Sensitive prompts, credentials, and customer data are not emitted in unsafe logs

## Blockers

Only [[01 Backlog/Phase 01 - Foundation and E2E Harness]].

## Execution notes

This phase can begin with the foundation fixtures and grow its scenarios as the
other phases land; it does not need to wait for a feature phase to be complete.
