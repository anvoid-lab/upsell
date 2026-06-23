Provide a practical help guide for swarm orchestration using JARVIS commands.

Explain clearly:
1. The two execution modes and how to detect which applies:
   - **Agent Teams mode** (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`): uses `TeamCreate`/`TaskCreate`/`SendMessage` — requires Claude Code v2.1.32+. Enable via `~/.claude.json`: `{ "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }`
   - **ADK mode** (fallback): uses `env-create`/`agent-spawn`/`agent-send` — works without any extra config
2. When to use each swarm command:
   - `/swarm-start`: initialize parallel work by domain — auto-selects mode
   - `/swarm-status`: consolidate operational status and blockers
   - `/swarm-merge`: run dependency-aware integration workflow
3. Recommended execution order and checkpoints
4. Guardrails that must not be bypassed (kanban lifecycle, gates, no force push, no merge without explicit user approval)
5. Example invocations users can copy
6. Common mistakes and how to avoid them

Output style:
- concise, operator-focused
- actionable next steps
- no implementation changes
