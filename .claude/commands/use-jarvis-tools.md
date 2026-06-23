Use Jarvis tools instead of native Claude Code tools to save tokens and stay within context limits.

## Rule

**Always prefer mcp__jarvis__* tools over native Read/Grep/Glob/Agent/Bash equivalents.**

| Instead of | Use |
|---|---|
| Read (file) | `mcp__jarvis__file-read` |
| Grep / Agent search | `mcp__jarvis__rag-search` or `mcp__jarvis__rag-snippet` |
| Agent(Explore) for codebase | `mcp__jarvis__rag-search` then `mcp__jarvis__rag-snippet` |
| Read vault .md files | `mcp__jarvis__vault-read-section` |
| Edit vault .md files | `mcp__jarvis__vault-write-section` |
| Grep for tool usage | `mcp__jarvis__rag-oracle-search` |

## Why

- Jarvis tools return only the relevant chunk — not the full file
- Native Read/Grep load entire files or spawn subprocesses — 3–10× more tokens
- After `/compact`, this instruction is lost — run `/use-jarvis-tools` to restore

## Quick reference

```
rag-search query="..."          — semantic search across indexed source files
rag-snippet query="..." path="..." — get a specific symbol/chunk from a file
rag-oracle-search query="..."   — tool usage guides and methodology docs
file-read path="..." offset=N limit=N  — read file with line range (fallback only)
vault-read-section path="..." heading="..."  — read a vault doc section
```

> If a file is not indexed, fall back to `file-read` with explicit `offset` and `limit`.
