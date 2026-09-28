---
type: architecture
title: Sales Copilot Overview
updated: 2026-09-26
related:
  - "[[02 Architecture/Agent Boundaries]]"
  - "[[02 Architecture/Persistence and Context]]"
  - "[[02 Architecture/Request Lifecycle and State]]"
  - "[[02 Architecture/Repository Boundary]]"
  - "[[03 Contracts/Agent Runtime]]"
---

# Sales Copilot Overview

## Stack

| Concern | Choice |
| --- | --- |
| Language | Python 3.14 |
| HTTP boundary | FastAPI, served by Uvicorn |
| Data validation | Pydantic models |
| Relational store | Supabase (PostgreSQL) through its async client, reached over PostgREST |
| Context cache | Redis |
| Agent runtime | OpenAI Agents SDK |
| Tests | pytest, with deterministic fakes for models, cache, and database |

Schema changes live in the sibling Supabase project, described in
[[05 Workspace/External Projects]]. Only `lib/` talks to Redis or Supabase.

## Boundaries

```text
Client
  -> FastAPI application
  -> Main Agent
       -> common validated tools
       -> Sales Agent as Agent.as_tool()
             -> lead/context tools
             -> Sales knowledge retrieval (pgvector)
             -> sales action recommendation
  -> policy engine -> direct result | pending approval | rejected
  -> persistence / audit / tracing

Scheduler -> worker -> persisted context -> Sales Agent -> policy -> action/result
```

The Main Agent is the interaction controller, not the source of business truth.
Trusted data comes from application tools and persistence. Deterministic rules
are evaluated by application code. The LLM proposes reasoning or actions inside
the capabilities exposed to it; it does not grant itself permission.

The implementation should prefer native OpenAI Agents SDK primitives: Agents,
function tools, `Agent.as_tool()`, structured outputs, sessions, `RunState`,
human approval interruptions, and tracing. Additional orchestration is not part
of the MVP boundary.

## Source layout

| Folder | Concern |
| --- | --- |
| `app/api/<feature>/` | One folder per feature: its routes, services, and custom persistence |
| `app/api/middlewares/` | Cross-cutting request concerns, grouped by concern |
| `core/` | Contracts, errors, tenant context, shared bases, configuration, logging |
| `agents/` | Agent definitions, capabilities, and prompts |
| `knowledge-base/` | Sales knowledge content |
| `lib/` | The only modules that talk to Redis or Supabase |
| `tests/` | Unit suite and smoke suite |

A feature folder and the cross-cutting concerns are described in
[[02 Architecture/Request Lifecycle and State]] and
[[04 Decisions/ADR-007 A Feature Is One Folder]].
