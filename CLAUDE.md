# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `web-app/`:

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run lint       # ESLint
npm run seed       # Seed Supabase with fixture data (requires .env.local)
```

No test suite is configured yet.

## Architecture

**VendAI** is a Next.js 16 App Router SSR dashboard (unified inbox + AI sales assistant). The app lives entirely in `web-app/`.

### Path aliases

| Alias | Resolves to |
|-------|-------------|
| `@/*` | `web-app/src/*` |
| `@core/*` | `web-app/core/*` |
| `@db/*` | `web-app/database/*` |

### Layer stack

```
core/contracts/          Zod schemas + inferred TS types for all domain entities
core/repository/         BaseRepository<T> — generic Supabase CRUD with soft-delete
core/exceptions/         AppException.wrap() wraps every DB error with context
database/client.ts       createSupabaseServerClient() — cookie-aware SSR Supabase client
database/migrations/     Raw SQL run once in Supabase SQL Editor (not auto-applied)
database/seed.ts         Inserts fixture data; run with `npm run seed`
src/app/(auth)/          Login + signup (email/password)
src/app/(app)/           Authenticated app: inbox, analytics, settings
src/lib/format.ts        Date formatting — the DB stores instants, the view formats them
src/proxy.ts             Middleware; validates the Supabase session
src/types/index.ts       Re-exports all types from @core/contracts
```

### Data flow pattern

Server pages (`page.tsx`) call a **service** (marked `"server-only"`) → pass typed data as props to a **client view** component (`'use client'`). Services instantiate `BaseRepository` directly; they never leak to the client.

Example: `inbox/page.tsx` → `InboxConversationListService.fetchConversations()` → `<InboxView initialConversations={…} />`.

### Contracts

Every domain entity has a contract file in `core/contracts/` that exports:
- A Zod schema (e.g. `ConversationContract.entitySchema`)
- Inferred TypeScript types (e.g. `Conversation`, `ConversationDoc`)
- Request/response schemas used to validate service output

`ConversationDoc` is the raw DB shape (no messages). `Conversation` extends it with `messages[]` joined by the service layer.

### Auth

Email + password via Supabase Auth (`signInWithPassword` / `signUp`). **The Supabase session
is the only source of truth** — there is no second session layer. `src/proxy.ts` calls
`supabase.auth.getUser()` to protect `(app)` routes.

This matters for more than tidiness: RLS policies key off `auth.uid()`, so a custom session
cookie that Supabase doesn't know about would authenticate the user while every query still
returned zero rows — an app that looks empty instead of logged out.

Signing up creates a new tenant: a trigger (`handle_new_user`) creates a `businesses` row and
the matching `profiles` row.

### Multi-tenancy and RLS

Every domain table carries `business_id`, and RLS confines each tenant to its own rows.
Policies use `current_business_id()`, a `SECURITY DEFINER` function resolving
`auth.uid()` → `profiles.business_id`. It must be `SECURITY DEFINER`, otherwise a policy on
`profiles` that reads `profiles` recurses infinitely.

`business_id` columns default to `current_business_id()`, so the repository layer never has to
set it on insert. `WITH CHECK` on every policy blocks writing into another tenant's rows.

There are **no policies for `anon`** — without a session there is no data. `npm run seed`
therefore needs `SUPABASE_SECRET_KEY`, which bypasses RLS.

### Database

Supabase (PostgreSQL). To set up a fresh environment, run these in the Supabase SQL Editor in
order, then seed:

1. `database/migrations/001_initial_schema.sql`
2. `database/migrations/002_timestamps_to_timestamptz.sql`
3. `database/migrations/003_multi_tenancy_and_rls.sql`
4. `npm run seed`

Timestamps are `timestamptz`. Never store display-formatted strings in a time column —
formatting belongs in `src/lib/format.ts`.

### Required env vars (`web-app/.env.local`)

Copy `web-app/.env.example` and fill it in.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=       # server-only; bypasses RLS. Never prefix with NEXT_PUBLIC_
```

`SUPABASE_SECRET_KEY` is used only by `npm run seed`. Prefixing it with `NEXT_PUBLIC_` would
publish unrestricted database access in the browser bundle.

### Soft deletes

`BaseRepository.delete()` sets `deleted_at` (soft). `hardDelete()` removes rows. All `findAll` / `findById` queries filter `deleted_at IS NULL` by default.
