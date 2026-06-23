---
description: JARVIS kanban card lifecycle — grooming, sprint management, gate tasks, and board operations
---

You are operating with the JARVIS kanban methodology. Follow this lifecycle for all development work.

## Card Lifecycle

```
backlog → grooming → ready → doing → review → tested → done
```

Never skip steps. Never commit code without an active card in `doing`.

## Before Coding (Grooming Checklist)


All steps required before moving to `ready`:

1. `kanban-card-create title="..."` — criar card (título apenas)
2. `vault-create-document path="12-Scope-Docs/CD-XXX-title.md"` — **spec vive AQUI** (problema + valor + fronteiras)
3. `kanban-card-scope-doc` — linkar scope doc ao card
4. `kanban-card-update card_id="CD-XXX" description="[[CD-XXX-title]]"` — body do card = wikilink apenas
5. `kanban-card-criteria` — adicionar mínimo 2 acceptance criteria
6. `kanban-card-estimate` — Fibonacci points: 1, 2, 3, 5, 8, 13, 21
7. `kanban-card-assign-epic` — atribuir a um epic
8. `kanban-grooming-validate` — deve passar antes de mover para ready

Then:
- `kanban-card-move status="ready"`
- `kanban-card-assign agent="<model>"` + `kanban-card-assign-sprint sprint_id="SP-XXX"`
- `kanban-card-move status="doing"`
- `context-session-start purpose="CD-XXX: <title>"`

## After Coding

1. `npm run build && npm test` — zero errors required
2. Commit: `Add X (CD-XXX)` or `Fix Y (CD-XXX)` — imperative, card ref
3. Meet all AC + gate tasks: `kanban-gate-list` → `kanban-gate-meet`
4. `kanban-card-criteria-meet` for each AC
5. `kanban-card-move status="review"` → `"tested"` → `"done"`
6. `context-session-finish`

## Key Tools


| Action | Tool |
|---|---|
| View board | `kanban-board-view` |
| Create card | `kanban-card-create title="..."` |
| Set card body | `kanban-card-update card_id="CD-XXX" description="[[CD-XXX-title]]"` |
| Move card | `kanban-card-move card_id="CD-XXX" status="doing"` |
| List gate tasks | `kanban-gate-list card_id="CD-XXX"` |
| Meet a gate | `kanban-gate-meet card_id="CD-XXX" gate_index=0 evidence="..."` |
| Meet AC | `kanban-card-criteria-meet card_id="CD-XXX" index=0` |
| Create epic | `kanban-epic-create title="..."` |
| Create sprint | `kanban-sprint-create name="Sprint N" goal="..."` |
| Validate grooming | `kanban-grooming-validate card_id="CD-XXX"` |

## Guardrails

- NEVER modify codebase or docs without a card in `doing`
- NEVER skip grooming — `kanban-grooming-validate` must pass
- NEVER rubber-stamp gate tasks — provide real evidence
- NEVER commit to `main` — feature branches only
- NEVER push without explicit user approval
