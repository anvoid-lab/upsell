---
type: architecture
title: Sales Copilot Overview
updated: 2026-09-25
related:
  - "[[02 Architecture/Agent Boundaries]]"
  - "[[02 Architecture/Persistence and Context]]"
  - "[[03 Contracts/Agent Runtime]]"
---

# Sales Copilot Overview

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
