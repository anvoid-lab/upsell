---
type: architecture
title: Agent Boundaries
updated: 2026-09-25
related:
  - "[[04 Decisions/ADR-001 Main Agent Owns Routing]]"
  - "[[03 Contracts/Agent Runtime]]"
---

# Agent Boundaries

## Main Agent

Owns request interpretation, clarification, common operational tools, and the
decision to invoke the Sales Agent. It has no direct Sales RAG tool and should
not perform unnecessary retrieval or deep sales reasoning.

## Sales Agent

Owns lead analysis, sales strategy, objection handling, qualification,
upsell/cross-sell reasoning, sales knowledge retrieval, and recommendations. It
is exposed to the Main Agent through `Agent.as_tool()`, not as a mandatory
handoff pipeline.

## Application services

Own persistence, tenant authorization, deterministic business rules, action
execution, scheduling, idempotency, audit, and external side effects. These
services remain authoritative over model recommendations.

## Knowledge base

Only the Sales Agent can retrieve static sales playbooks, techniques, objection
guidance, and sales-process knowledge through `ai_sales_knowledge`. Business,
customer, product, price, and stock data come from deterministic operational
tools. The entire sales corpus is never injected into every request.
