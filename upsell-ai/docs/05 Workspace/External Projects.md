---
type: workspace
title: External Projects
updated: 2026-09-25
related:
  - "[[00 Home/Index]]"
  - "[[02 Architecture/Persistence and Context]]"
  - "[[01 Backlog/Phase 01 - Foundation and E2E Harness]]"
---

# External Projects

Related projects are linked through the VS Code workspace file `upsell-ai.code-workspace` at the repository root. Open that file to work across this repository and its external dependencies. Do not copy those projects into `upsell-ai`.

## Linked folders

| Name | Path | Owns |
| --- | --- | --- |
| upsell-ai | `.` | Copilot API, agents, contracts, and external client adapters in `lib/` |
| supabase | `../supabase` | PostgreSQL migrations, RLS, and seed data for the inbox and copilot tables |

## Rules

- Schema changes for businesses, customers, and products belong in `../supabase/migrations`.
- This repository reaches Supabase only through `lib/supabase`.
- Redis is reached only through `lib/cache`.
- Tenant identity on the API is `X-Tenant-Id`. It maps to `businesses.id` in the sibling database.
