# CLAUDE.md

## JARVIS Plugin

This workspace uses the JARVIS MCP Plugin for Claude Code.
See [AGENTS.md](./AGENTS.md) for workspace-specific agent instructions and tool inventory.

## Session Lifecycle

At the **start of each session**, call `context-session-start` to restore active session state.
At the **end of a session**, use `/context-checkpoint` to save state and compact context.

## Governance Oracle

Before any card lifecycle action, query the workflow oracle:

```
governance-next-step card_id="CD-XXX"
```

Returns the exact next tool + args to call. With `intent` parameter, validates a specific action:

```
governance-next-step card_id="CD-XXX" intent="modify-code"
```

Valid intents: `create-card`, `groom-card`, `start-work`, `modify-code`, `commit`, `create-pr`, `move-card`, `complete-card`

## Key Skills

| Skill | Purpose |
|---|---|
| `/context-checkpoint` | Save session and compact context |
| `/healthcheck` | Diagnose environment |
| `/start-card <CD-XXX>` | Groom and start a kanban card (uses oracle) |

## Guardrails

- Always read existing code before modifying
- `npm run build` must pass before committing
- Never commit to `main` without explicit approval
