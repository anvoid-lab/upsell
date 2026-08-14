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
src/app/(auth)/          Login + magic-link callback routes
src/app/(app)/           Authenticated app: inbox, analytics, settings
src/lib/session.ts       JWT session cookie (jose) — vendai_session, 30-day TTL
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

Magic-link email via Supabase Auth. After OAuth callback (`/auth/callback`), a signed JWT is written to the `vendai_session` httpOnly cookie using `src/lib/session.ts`. Middleware reads this cookie to protect `(app)` routes.

### Database

Supabase (PostgreSQL). To set up a fresh environment:
1. Run `database/migrations/001_initial_schema.sql` in the Supabase SQL Editor.
2. Run `npm run seed` to populate fixture data.

### Required env vars (`web-app/.env.local`)

Copy `web-app/.env.example` and fill it in.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SESSION_SECRET=            # min 32 chars — openssl rand -base64 32
```

`SESSION_SECRET` has no default. `src/lib/session.ts` throws on first use if it is
missing or shorter than 32 characters, rather than falling back to a predictable key.

### Soft deletes

`BaseRepository.delete()` sets `deleted_at` (soft). `hardDelete()` removes rows. All `findAll` / `findById` queries filter `deleted_at IS NULL` by default.
