---
type: home
title: How to use
updated: 2026-09-15
related:
  - "[[00 Home/Index]]"
  - "[[Templates/Phase]]"
  - "[[Templates/ADR]]"
---

# How to use

## Conventions

- Use `[[Wikilinks]]` for all internal navigation.
- Keep durable architecture knowledge in `02 Architecture`.
- Keep typed domain definitions and schema-facing notes in `03 Contracts`.
- Record stable decisions as new ADRs in `04 Decisions`.
- Track phased delivery work in `01 Backlog`.

## Source of truth

Use this precedence when updating notes:

1. Implemented code and migrations in `web-app/`
2. Active operational backlog in `web-app/docs/tasks/backlog.md`
3. Focused execution plans in `web-app/docs/tasks/`
4. Historical product ideas in `ideas/`

If a strategic note conflicts with code, document the mismatch explicitly and treat
the code as the implemented truth.

## Writing style

- Prefer short sections over long prose.
- Capture facts first, assumptions second, open questions last.
- Add `related:` links in frontmatter when notes depend on one another.
- Treat ADRs as append-only records; supersede them with a new ADR instead of editing
  the old decision narrative.

## Updating phases

- One file represents one phase or epic.
- Keep acceptance criteria observable and testable.
- Move completed details into execution notes instead of deleting the history.

## Updating contracts

- Document the current meaning of the concept.
- Note important validation rules, identifiers, and persistence boundaries.
- Link to upstream architecture notes and downstream ADRs where behavior is constrained.
