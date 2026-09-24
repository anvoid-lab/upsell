---
type: phase
phase: 3
title: Sales Copilot Definition
status: planned
priority: medium
depends_on:
  - "[[01 Backlog/Phase 01 - Real Channel MVP]]"
  - "[[01 Backlog/Phase 02 - Inbox Persistence and Recovery]]"
updated: 2026-09-15
related:
  - "[[02 Architecture/Inbox Domain]]"
  - "[[03 Contracts/Follow Up]]"
  - "[[04 Decisions/ADR-001 Active Scope Excludes AI Execution]]"
---

# Phase 03 - Sales Copilot Definition

## Objective

Define the future Sales Copilot contract that proposes follow-up actions without
reintroducing the removed AI execution stack prematurely.

## Deliverables

- [ ] A stable contract for suggested follow-up actions
- [ ] UI flow for approve, edit, reject, and automation settings
- [ ] Rules for cancellation, eligibility, and provider-safe sending windows
- [ ] Clear boundary between proposal logic and deterministic execution

## Backlog

- [ ] Specify the shape of a Copilot suggestion
- [ ] Define approval-mode behavior for the first release
- [ ] Define optional future automatic mode and guardrails
- [ ] Preserve existing follow-up infrastructure without exposing false UI affordances
- [ ] Document dependencies on real outbound channel delivery

## Acceptance criteria

- [ ] The product, UX, and technical contract are aligned in a written note
- [ ] Follow-up execution remains separate from suggestion generation
- [ ] The first assisted mode is explicit about human approval
- [ ] Safety and cancellation rules are documented before implementation starts

## Blockers

- Real outbound channel delivery must exist first
- Provider rules for automated or template-driven sending must be known

## Execution notes

This phase corresponds to backlog items `T-008`, `T-009`, `T-014`, and `T-035`
in their current reframed form. It treats the older AI sales vision as future
direction, not as implemented scope.
