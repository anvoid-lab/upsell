Start a multi-session swarm workflow. Mode is selected automatically based on environment.

**Mode detection:** check if `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set
(run `node -e "process.stdout.write(process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS??'')"` or read /healthcheck "Agent Teams" result).

---

## Agent Teams mode (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1)

1. Parse domains from user input (or infer 2-4 domains from the current objective)
2. For each domain, groom and start a Kanban card:
   - `kanban-card-create` → scope doc → AC → estimate → validate grooming → ready
   - Assign sprint + agent → move to doing
3. Create the agent team: `TeamCreate` with name "swarm-CD-XXX"
4. For each domain card: `TaskCreate` with card ID, domain boundary, and ownership paths
5. Spawn one teammate per domain (subagent type "claude"); include in spawn prompt: card ID, scope doc path, AC, file ownership, "do NOT modify kanban state"
6. Report summary table: | Domain | Card | Teammate | Task | Status |

---

## ADK mode (fallback — Agent Teams not available)

1. Parse domains and groom/start a Kanban card per domain (same as above)
2. For each card in doing:
   - `env-create` with card link and purpose → `env-status action="activate"`
   - `agent-spawn` with domain brief
   - `agent-send` including card ID, env ID, boundaries, and ownership paths
3. Report summary table: | Domain | Card | Env | Session | Status |

---

Rules:
- No implementation without card in doing
- Each worker owns a distinct set of files — no overlap
- Do not bypass Kanban or gate requirements
- **PR target policy**: swarm agents must create PRs to `staging` only — never directly to `main`. Set `azure-sync.prTargetPolicy: staging-only` in `config/jarvis.yaml` to enforce this automatically. Only a release agent or human merges `staging → main`.
- **Max open PRs**: default limit is 1 active PR per target branch (`azure-sync.maxOpenPrsPerTarget: 1`). Merge or abandon open PRs before creating new ones to prevent merge conflict accumulation.
