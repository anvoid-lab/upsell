---
type: architecture
title: Sales Copilot Overview
updated: 2026-09-28
---

# Sales Copilot Overview

Phase 01 is a FastAPI conversation boundary backed by Redis, an optional
database client for health, and the OpenAI Agents SDK.

```text
Client -> FastAPI -> Auth/RequestContext -> Idempotency -> Chat service
       -> AgentContext -> Main Agent / Runner -> AgentResponse
```

`app/app.py` owns application lifecycle and clients. `app/api/<feature>/` owns
feature routes and services. `core/` owns contracts, errors, context, policy,
logging, and shared bases. `app/agents/` owns agents and capability definitions.

The Main Agent is the only active agent in Phase 01. It uses the SDK runner and
contains one deterministic capability. Sales reasoning, RAG, approvals, and
scheduling start in later phases.
