---
type: phase
phase: 3
title: Sales Reasoning and Knowledge Base
status: planned
priority: high
depends_on:
  - "[[01 Backlog/Phase 01 - Foundation and E2E Harness]]"
updated: 2026-09-25
related:
  - "[[02 Architecture/Agent Boundaries]]"
  - "[[02 Architecture/Persistence and Context]]"
  - "[[02 Architecture/Redis Context Cache]]"
  - "[[02 Architecture/Sales Knowledge RAG]]"
  - "[[03 Contracts/Agent Context]]"
  - "[[03 Contracts/Agent Runtime]]"
  - "[[03 Contracts/Sales Agent Output]]"
---

# Phase 03 - Sales Reasoning and Knowledge Base

## Objective

Provide a specialized Sales Agent that analyzes lead context and retrieves only
relevant sales knowledge when needed, while remaining callable by the Main Agent
as an `Agent.as_tool()` capability.

## Owned E2E journey

User asks for a lead response strategy -> Main Agent invokes Sales Agent as a
tool -> Sales Agent loads trusted lead context and retrieves relevant knowledge
when necessary -> it returns a structured recommendation with evidence and
uncertainty -> Main Agent presents the result without inventing business facts.

## Deliverables

- [ ] Sales Agent prompt and `SalesAgentResponse` output inside the shared `AgentResponse`
- [ ] Normalize and validate the shape from `exemple-output.json`
- [ ] Optional external read-only context tools keyed by `TenantContext.customer_id`
- [ ] Static sales knowledge index in `ai_sales_knowledge`
- [ ] Chunking, embeddings, content hashes, and pgvector retrieval
- [ ] Business and product context tools backed by trusted operational data
- [ ] Knowledge ingestion and metadata filtering boundary
- [ ] Grounded response and no-answer behavior

## Acceptance criteria

- [ ] Main Agent cannot call the Sales RAG tool directly
- [ ] Retrieval queries `ai_sales_knowledge` and returns ready-to-use chunk content
- [ ] Business data is retrieved through tools and never through tenant document RAG
- [ ] Every indexed chunk resolves to its static source through `source_path`
- [ ] Sales Agent can answer with no retrieval when context is sufficient
- [ ] Retrieved advice cites knowledge entries or clearly reports no support
- [ ] Unknown price, availability, or policy is never invented
- [ ] Recommendations use price and availability only from trusted product tools
- [ ] E2E tests cover direct reasoning, retrieval, irrelevant query, and no-answer paths
- [ ] E2E output preserves evidence-to-product links and follow-up intent

## Blockers

Only [[01 Backlog/Phase 01 - Foundation and E2E Harness]].

## Execution notes

The knowledge-base implementation can evolve independently from CRUD, HITL, and
scheduler work as long as the Sales Agent contract remains stable.
