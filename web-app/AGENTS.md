# AGENTS.md

## DESIGN PRINCIPLES

- SOLID: all 5 principles, every class/module
- DDD: domain layer zero external deps; repo interfaces in domain, impls in infra
- Max 500 lines/file — split by SRP when approaching limit
- No direct cross-context imports — use ports/adapters at composition root
- No fallback/mock to mask errors — throw with proper context
- Immutable value objects; entities mutate only via domain methods

## KANBAN LIFECYCLE (mandatory for all work >15 min)

Pipeline: `backlog→grooming→ready→doing→review→tested→done`  
Never commit to `main`. Never skip steps.

### Before coding
1. `kanban-card-create` → assign epic + sprint
2. Groom (all 4 required):
   - `vault-create-document path="12-Scope-Docs/CD-XXX-title.md"`
   - `kanban-card-scope-doc card_id="CD-XXX" path="12-Scope-Docs/CD-XXX-title.md"`
   - `kanban-card-criteria` (min 2 AC)
   - `kanban-card-estimate` (Fibonacci: 1,2,3,5,8,13,21)
3. `kanban-grooming-validate` → fix errors → move to `ready`
4. `kanban-card-assign` + `kanban-card-assign-sprint` → move to `doing`
5. `context-session-start purpose="CD-XXX: <title>"`

Grooming = problem + value + boundaries. No class names, method signatures, or code.

### After coding
6. Build + test suite — zero errors/warnings
7. Commit: `Add X (CD-XXX)` | `Fix Y (CD-XXX)` (imperative, card ref)
8. Meet all AC + gate tasks → `doing→review→tested→done`
9. `vault-manage` — update dashboard + any affected docs

## FORMAL SPECIFICATION (TLA+)

- Run `formal-spec-analyze card_id="CD-XXX"` after grooming to decide if formal spec is required.
- For required cards, create artifacts under `obsidian-vault/13-Formal-Specs/CD-XXX/`:
  - `spec.tla`
  - `spec.cfg` (recommended)
  - `report.md`
  - `diagram.mermaid`
- Validate with `formal-spec-validate` before implementation.
- Generate review artifacts with `formal-spec-report`.
- Human tech lead uses report + diagram as go/no-go input before coding.
- `healthcheck` verifies Java runtime and bundled `vendor/tla2tools.jar` readiness.

## GUARDRAILS

NEVER:
- modify codebase or documentation without an active kanban card in `doing` state — no card = no change
- fallback/mock to mask errors — errors must throw with proper context
- "simpler approach" to bypass the real solution
- read `.csv` directly → `data-csv-query`
- read `.yaml/.yml` directly → `data-yaml-get`
- read `.env/.pem/.key` — blocked by governance
- Read any `.md` file directly → use `vault-manage`/`vault-read-section` for vault docs, `rag-snippet` for all other `.md`
- `git push --force` on main/master
- `npm publish` without explicit user approval — publishing is a deployment action
- create `TODO.md`, `PLAN.md`, `ROADMAP.md` — use kanban tools
- bypass kanban for trackable work
- push to git without explicit user approval
- start the app from agent session — ask user for separate terminal
- skip grooming requirements or gate tasks

ALWAYS:
- `rag-search`/`rag-snippet` before creating or modifying any `.md` file
- `rag-snippet` for targeted retrieval from `.md` files (plain text documents, not source code)
- use specialized tools over raw file/shell ops
- get full codebase context before changes — ask if unclear
- `context-session-start` before any card work
- meet all gate tasks before `review→tested→done`

## GOVERNANCE (runtime enforced)

Hook fires on every tool call — `error` severity blocks, `warning` advises.
- file-access: block direct CSV/YAML/env reads; block direct `.md` reads
- shell-safety: block npm publish, force-push; warn destructive ops
- security: block env dump, credential file reads
- kanban: warn on file mutation without active card; require gate tasks before transitions

`governance-validate` — pre-check before risky ops  
`governance-policies` — list active policies

## CODE QUALITY GATES

Before moving `doing→review`:
- Build passes with zero errors
- All existing tests pass
- New behaviour covered by tests
- No secrets or credentials in code
- No debug/console output left in production paths

Before moving `review→tested`:
- AC verified against running code (not just reading)
- Edge cases and error paths tested

Before `tested→done`:
- Vault docs updated
- Commit references card ID

## GIT

- feature branches only — never commit to `main`
- commit: `Add X (CD-XXX)` | `Fix Y (CD-XXX)`
- no amend on pushed commits
- no push without explicit user approval
- **push to Azure DevOps ALWAYS via `bash scripts/setup/azpush.sh`** — never `git push` directly
  - `origin` remote is HTTPS; SSH and raw PAT do not work reliably
  - `azpush.sh` uses `az account get-access-token` for a fresh bearer token
  - Usage: `bash scripts/setup/azpush.sh -u origin <branch>`
- after push: create PR with `azure-pr-create` tool (target branch: `main`)

## VAULT

Path: `obsidian-vault/`
- `09-Dashboards/` — metrics and status
- `11-Domain-Reference/` — per-context architecture decisions
- `12-Scope-Docs/CD-XXX-*.md` — grooming scope documents

Tool: `vault-manage` (inspect/read/write/create/search)  
Use structured lists, not markdown tables.

## WORKSPACE TOPOLOGY

- Always classify workspace repository topology with `workspace-update ... repo_type="..."`
  - main orchestrator without git repo: `MAIN-NO-REPO`
  - main orchestrator mono-repo root: `MAIN-MONO-REPO`
  - main orchestrator with its own independent repo: `MAIN-INDEPENDENT-REPO`
  - child module in mono-repo: `MODULE-MONO-REPO`
  - child module with independent repo: `MODULE-INDEPENDENT-REPO`
  - module without repo: `MODULE-NO-REPO`
- When linking parent -> child modules:
  - use `SYSTEM-MODULE` for mono-repo parent/child relationships
  - use `SYSTEM-MODULE-INDEPENDENT-REPO` when each child is a separate repository
- Keep API runtime contract links explicit with `api-consumer` from consumer workspace to provider workspace.
- For Azure/Git workflows:
  - if parent is `MAIN-NO-REPO`, do not run git push/PR from parent; execute version-control flows in child module repositories
  - if parent is `MAIN-MONO-REPO`, run git push/PR from parent repo and keep module boundaries via dependency links

## TOOLS — KEY WORKFLOWS

| Need | Tool |
|---|---|
| Start work on a card | `/start-card CD-XXX` |
| Check environment health | `/healthcheck` |
| Explore codebase semantically | `rag-search` / `rag-snippet` |
| Look up JARVIS workflow docs | `rag-oracle-search query="..."` |
| Track a decision or finding | `context-note-add` |
| Plan multi-step work | `context-todo-add` |
| View board state | `kanban-board-view` |
| Check governance rules | `governance-policies` |
| Sync with Azure DevOps | `/sync-azure` |

## WORKFLOW DOCS

Unknown workflow → search ORACLE first:
- kanban: `rag-oracle-search query="..." domain="workflows"`
- governance: `rag-oracle-search query="..." domain="governance"`
- patterns: `rag-oracle-search query="..." domain="patterns"`
- setup: `rag-oracle-search query="..." domain="quick_reference"`

## SLASH COMMANDS

- `/start-card CD-XXX` — full card lifecycle start
- `/healthcheck` — diagnostics + fix guidance
- `/sync-azure` — Azure DevOps sync workflow
- `/jarvis-agents-md-file` — regenerate this file

## CONFIG


All settings live in `config/jarvis.yaml`. Read: `config-read section="<name>"`. Write: `config-write section="<name>" values='{...}'`.

| Section | Key | Default | Description |
|---|---|---|---|
| `interaction` | `verbosity` | `"concise"` | LLM response length: `concise` \| `normal` \| `verbose` |
| `interaction` | `balanceAlertUsd` | `null` | WARNING in `workspace-info` when total spend exceeds this USD value |
| `token-metrics` | `sprintBudgetUsd` | `null` | Sprint cost budget in USD |
| `token-metrics` | `budgetAlertThreshold` | `0.8` | Alert at this fraction of sprint budget |
| `azure-sync` | `organization` | `""` | Azure DevOps org name |
| `kanban` | `minTransitionIntervalSecs` | `30` | Min seconds between card status transitions |

Quick setup after install:
```
config-write section="interaction" values={"verbosity":"concise","balanceAlertUsd":10}
```
