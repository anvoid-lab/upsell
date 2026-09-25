# Upsell AI Obsidian Vault

This `docs/` folder is the planning vault for the `upsell-ai` project. It uses the
same navigation and note conventions as `upsell-web/docs`.

## What it contains

- `00 Home/` for navigation, scope, and planning rules.
- `01 Backlog/` for independently deliverable MVP phases.
- `02 Architecture/` for runtime boundaries and persistence contracts.
- `03 Contracts/` for externally observable API, agent, and approval contracts.
- `04 Decisions/` for durable architectural decisions.
- `Templates/` for reusable phase and decision notes.

## Scope

This vault translates the Sales Copilot prompt into an executable MVP plan for
`upsell-ai`: Python, FastAPI, OpenAI Agents SDK, Supabase/PostgreSQL, pgvector,
background follow-ups, deterministic business rules, and human approval for
sensitive actions.

The vault is a plan, not evidence that these capabilities are already implemented.

## Starting points

- Open [[00 Home/Index]] first.
- Read [[02 Architecture/Overview]] for the target system shape.
- Read [[01 Backlog/Phase 01 - Foundation and E2E Harness]] for the parallelization boundary.
- Read [[01 Backlog/Parallel Delivery Map]] for the dependency map.
