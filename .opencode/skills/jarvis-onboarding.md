---
description: JARVIS first-run setup — workspace registration, RAG indexing, healthcheck, and tool orientation
---

You are helping a developer set up JARVIS in a new project. Follow this sequence.

## First-Run Setup Sequence

### Step 1 — Run healthcheck
```
/healthcheck
```
Diagnoses the environment: Ollama, SQLite, RAG index, config. Follow any fix guidance shown.

### Step 2 — Bootstrap the project
```
bootstrap
```
Creates `AGENTS.md`, `.opencode/commands/`, `.opencode/skills/`, and `config/jarvis.yaml` in the project.

### Step 3 — Register workspace
```
workspace-info identifier="." by_directory=true
```
If not registered, the healthcheck will prompt. Or register directly:
```
workspace-update id="WORKSPACE_ID" description="My project"
workspace-update id="WORKSPACE_ID" repo_type="MODULE-INDEPENDENT-REPO"
```

### Step 4 — Configure Azure DevOps (optional)
```
config-write section="azure-sync" values={"organization":"MyOrg","project":"MyProject","repository":"MyRepo"}
```

### Step 5 — Index the codebase for RAG
```
rag-index workspace="WORKSPACE"
```
Required for `rag-search` and `rag-snippet` to work. Takes 1-3 minutes on first run.

### Step 6 — Index ORACLE documentation
```
rag-oracle-index directory="obsidian-vault"
```
Enables `rag-oracle-search` for workflow guidance.

### Step 7 — Verify
```
rag-status workspace="WORKSPACE" include_oracle=true
healthcheck
```

## Key Tools by Category

### Project Memory
- `context-session-start/finish` — track work sessions
- `context-note-add` — record decisions and discoveries
- `context-todo-add` — track tasks within a session

### Kanban
- `kanban-board-view` — see full board
- `kanban-card-create/move/assign` — manage cards
- `kanban-sprint-create/activate` — manage sprints

### RAG Search
- `rag-search query="..."` — semantic search across codebase
- `rag-snippet query="..."` — retrieve code with context
- `rag-oracle-search query="..." domain="workflows"` — search JARVIS docs

### Config
- `config-read` — show current config
- `config-write section="..." values={...}` — update config
- `healthcheck` — diagnose environment

### Azure DevOps
- Use `skill "jarvis-azure-sync"` for the full Azure workflow

### Kanban Lifecycle
- Use `skill "jarvis-kanban"` for the full card lifecycle

## AGENTS.md

The `AGENTS.md` file in your project root contains the full operational guide for JARVIS agents. If it's missing or outdated:
```
/jarvis-agents-md-file
```

## Common Issues

**Ollama not running** — `ollama serve` in a separate terminal

**Missing prerequisite models** — install all three required models:
```
ollama pull embeddinggemma:latest   # RAG embeddings
ollama pull gpt-oss:20b             # specs, formal analysis, SDD
ollama pull llama3.2:latest         # intent, classification, deploy-log
```

**RAG returns no results** — run `rag-index` first, then retry

**Plugin not loading** — verify `opencode.json` has `"plugin": ["@mc1global/opencode-jarvis"]`; check `~/.cache/opencode/node_modules/` for the package
