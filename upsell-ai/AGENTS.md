# Development Rules

## Plan approval gate

Every task and phase must start with a written plan in the Obsidian vault. The
plan must define scope, affected areas, acceptance criteria, risks, and
verification.

Implementation requires explicit manual approval of the plan. Until approval:

- Never create, modify, delete, or rename source code.
- Never modify tests, migrations, configuration, dependencies, or generated code.
- Read-only investigation and planning documentation are allowed.

Approval applies only to the approved scope. Any material scope change requires
a new approval. Without manual approval, never alter code.

Planning communication must be short and objective. Include only the information
needed to make a decision, avoiding long explanations and unnecessary repetition
to reduce token usage.

## Preserve manual changes

Treat any code changed manually by the developer as the latest version. Never
overwrite, revert, reset, or replace those changes. Continue the implementation
from the current working tree and adapt the plan or code around them.

## Source of truth

Use `docs/` as the source of truth for project phases, architecture, contracts,
and decisions. Read the relevant notes before implementation and update them
when behavior or scope changes.

## Development principles

- Prefer the simplest implementation that satisfies the approved scope.
- Avoid unnecessary abstractions, dependencies, agents, orchestration, and LLM calls.
- Do not build for hypothetical requirements.
- Keep functions focused; avoid one-line wrappers and unnecessary helpers.
- Use clear, idiomatic Python with strong typing and explicit Pydantic models at
  application boundaries.
- Validate external input at boundaries and treat model output as untrusted input.
- Keep concerns separated according to the existing project structure.
- Keep business logic out of FastAPI route handlers.
- Keep deterministic rules, authorization, idempotency, and side effects in
  application services.
- Add comments only for non-obvious constraints or intentional trade-offs.
- Do not add comments that restate the code.

## Project structure

- `app/`: FastAPI application and API concerns
- `core/`: configuration, logging, and shared infrastructure
- `agents/`: agent definitions and prompts
- `knowledge-base/`: sales knowledge content
- `workflows/`: background and multi-step execution
- `scripts/`: developer and data utilities
- `docs/`: Obsidian planning vault

## Verification

- Every feature phase must have an end-to-end test for its owned journey.
- Prefer deterministic fake adapters for models, databases, vector stores,
  schedulers, and external services.
- Test success, validation failure, authorization failure, retries, and safety
  behavior relevant to the change.
- Run focused checks first, then the full relevant test suite.
- Update `pyproject.toml` and `uv.lock` together when dependencies change.
- Do not commit secrets, environment files, generated caches, or unrelated changes.
