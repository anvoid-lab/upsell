---
type: architecture
title: Persistence and Context
updated: 2026-09-25
related:
  - "[[03 Contracts/Approval and Action]]"
  - "[[03 Contracts/Agent Runtime]]"
---

# Persistence and Context

Use PostgreSQL in the sibling `../supabase` project as the application source of
truth and Redis as the rebuildable agent-context cache. The workspace link is
[[05 Workspace/External Projects]]. Keep stable,
queryable fields relational: tenant, actor, business, conversation, run, action,
approval, schedule, status, timestamps, and idempotency keys. Keep evolving
agent state in JSONB, including serialized SDK run state where needed. Customer
and product rows required by `AgentContext` are migrations in that sibling
project; this repository reaches them only through `lib/supabase`, and services
read them through [[02 Architecture/Repository Boundary]]. Supabase credentials
live in `core/config.py` (`SUPABASE_URL`, `SUPABASE_KEY`), which is the single
configuration module — no `Settings` class exists.

Redis keeps customer context, recent messages, summaries, runtime state, and the
last response between requests. On cache miss, the application rebuilds context
from trusted PostgreSQL data.

Durable serialized run state, action persistence, and approval persistence are
deferred by [[04 Decisions/ADR-002 Defer Durable Agent Execution Persistence]].

Follow-ups are separate durable jobs. A worker loads current context when a job
is due, claims it idempotently, runs the required capability, and records the
outcome.
