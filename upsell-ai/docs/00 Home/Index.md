---
type: home
title: Upsell AI Vault Index
updated: 2026-09-26
related:
  - "[[00 Home/How to use]]"
  - "[[02 Architecture/Overview]]"
  - "[[01 Backlog/Phase 01 - Foundation and E2E Harness]]"
  - "[[01 Backlog/Parallel Delivery Map]]"
---

# Upsell AI Vault Index

## Purpose

This vault is the implementation plan for the MVP Sales Copilot in `upsell-ai`.
It separates the minimum shared foundation from independent vertical slices so
multiple streams can be implemented and tested in parallel.

## Quick links

- [[00 Home/How to use]]
- [[01 Backlog/Phase 01 - Foundation and E2E Harness]]
- [[01 Backlog/Phase 02 - Direct Business Operations]]
- [[01 Backlog/Phase 03 - Sales Reasoning and Knowledge Base]]
- [[01 Backlog/Phase 04 - Human Approval and Governed Actions]]
- [[01 Backlog/Phase 05 - Scheduled Follow-ups]]
- [[01 Backlog/Phase 06 - Evaluation and Production Hardening]]
- [[01 Backlog/Parallel Delivery Map]]
- [[02 Architecture/Overview]]
- [[02 Architecture/Agent Boundaries]]
- [[02 Architecture/CRUD Tool Factory]]
- [[02 Architecture/Repository Boundary]]
- [[02 Architecture/Testing Strategy]]
- [[02 Architecture/Persistence and Context]]
- [[02 Architecture/Request Lifecycle and State]]
- [[02 Architecture/Redis Context Cache]]
- [[02 Architecture/Sales Knowledge RAG]]
- [[03 Contracts/Agent Context]]
- [[03 Contracts/Agent Runtime]]
- [[03 Contracts/Approval and Action]]
- [[03 Contracts/API]]
- [[03 Contracts/Sales Agent Output]]
- [[04 Decisions/ADR-002 Defer Durable Agent Execution Persistence]]
- [[04 Decisions/ADR-003 Async First]]
- [[04 Decisions/ADR-001 Main Agent Owns Routing]]
- [[04 Decisions/ADR-004 Errors Are Declared, Not Built In Place]]
- [[04 Decisions/ADR-005 One Tenant Context Per Request]]
- [[04 Decisions/ADR-006 Dependencies Are Declared, Not Constructed]]
- [[04 Decisions/ADR-007 A Feature Is One Folder]]
- [[04 Decisions/ADR-008 The Repository Owns Persistence Rules]]
- [[05 Workspace/External Projects]]

## Planning rule

Phase 01 is the only prerequisite for the feature phases. Phases 02 through 06
must depend on Phase 01 only, unless a later implementation decision explicitly
changes this rule. Each phase owns one complete user-visible workflow and its E2E
test, including its failure and safety behavior.

## Target MVP

The Main Agent is the single entry point. It executes low-risk common tools
directly and invokes the Sales Agent as an `Agent.as_tool()` only for sales
reasoning. Sales knowledge access remains private to the Sales Agent. Business
rules remain deterministic and application-enforced. Follow-ups run outside the
active agent process, and sensitive actions pause for human approval.
