Consolidate swarm status. Mode matches whichever was used in /swarm-start.

**Mode detection:** check CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 (same as /swarm-start).

---

## Agent Teams mode

1. List active doing/review/tested cards via `kanban-card-list`
2. Get task states via `TaskList` — correlate with card IDs
3. Ping each teammate via `SendMessage` asking for current progress and blockers
4. Report: | Domain | Card | Task Status | Teammate | Blocker | Next Action |

---

## ADK mode (fallback)

1. List active doing/review/tested cards via `kanban-card-list`
2. List active environments via `env-list filter="active"` — correlate by card/env linkage
3. Check agent progress via context notes/session status tools
4. Report: | Domain | Card | Env Status | Blocker | Next Action |

---

Rules:
- Prefer live tool results over assumptions
- Surface blockers early
- Keep output actionable
