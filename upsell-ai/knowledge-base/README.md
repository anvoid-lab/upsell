---
id: knowledge-base-home
doc_type: knowledge-map
title: Sales Copilot Knowledge Base
status: approved
production_ready: false
language: en
owner: product
---

# Sales Copilot Knowledge Base

Open this directory as an Obsidian vault. Markdown files and their YAML properties remain the portable source; Obsidian provides navigation and authoring support.

## Knowledge areas

- Global methodology starts with [[sales/foundations/adaptive-consultative-selling|Adaptive Consultative Selling]].
- Discovery and qualification connect through [[sales/sales-process/discovery/progressive-discovery|Progressive Discovery]] and [[sales/sales-process/qualification/minimum-viable-qualification|Minimum Viable Qualification]].
- Situation-specific guidance lives under `sales/decisions/` and `sales/objections/`.
- Tenant knowledge starts at [[tenants/baia-luanda/README|Baía Luanda Tenant Guide]].

## Relationship rules

- Declare semantic relationships in the `related` YAML property using vault-root Wikilinks.
- Global notes may link only to global notes.
- Tenant notes may link to global notes and notes belonging to the same tenant.
- Never create a link from one tenant to another tenant.
- Keep `id` stable when renaming or moving a note.
- Use headings for independently retrievable facts and policies.

Phase 3 will parse, validate, and index these relationships. Obsidian configuration and generated views are authoring aids, not runtime data.
