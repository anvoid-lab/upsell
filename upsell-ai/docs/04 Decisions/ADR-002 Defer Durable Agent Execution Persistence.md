---
type: adr
title: Defer Durable Agent Execution Persistence
status: accepted
updated: 2026-09-25
related:
  - "[[01 Backlog/Phase 04 - Human Approval and Governed Actions]]"
  - "[[02 Architecture/Redis Context Cache]]"
  - "[[02 Architecture/Sales Knowledge RAG]]"
---

# ADR-002 - Defer Durable Agent Execution Persistence

## Decision

Do not create `agent_runs`, `agent_actions`, or `agent_approvals` in the current
MVP. Redis provides reusable customer context, while normal request execution
remains short-lived.

Do not create `ai_knowledge_documents` or `ai_knowledge_chunks` in the current
MVP. Tenant-specific business documents are not indexed. Business, customer,
product, price, and stock data are retrieved through operational tools. The only
MVP vector table is `ai_sales_knowledge` for static sales guidance.

## Re-evaluation triggers

- Durable Human-in-the-Loop pause and resume becomes active scope
- External side effects require persistent idempotency and audit records
- Runs must survive process or Redis loss
- Production support requires historical execution inspection
- Businesses need to upload or manage tenant-specific documents for RAG

When one of these conditions becomes active, redesign the deferred tables against
the actual workflow before creating migrations.
