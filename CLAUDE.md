# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `web-app/`:

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # ESLint
npm run seed             # Seed Supabase with fixture data (requires .env.local)
npm run test             # Unit tests (Vitest) — no network, no credentials needed
npm run test:watch       # Unit tests in watch mode
npm run test:integration # Hits the live Supabase project — see below
```

### Tests

Vitest. `*.test.ts` files live next to the code they test (`src/lib/format.test.ts`, not a
separate `__tests__/` tree).

`npm run test` never touches the network — mock `@db/client` for anything that reaches
Supabase. `tests/integration/` is excluded from that run; it's for tests that must exercise
the real database (chiefly RLS policies, which cannot be verified against a mock). Those need
`.env.local` and run via `npm run test:integration`. Each one must create its own throwaway
data and delete it in `afterAll`, regardless of whether the test passed — never assert against
or mutate the seeded fixtures.

The `"server-only"` import some services use only exists as a Next.js bundler alias; it doesn't
resolve under plain Node. `vitest.config.mts` aliases it to `test/stubs/server-only.ts` — no
per-file workaround needed.

## Architecture

**VendAI** is a Next.js 16 App Router SSR dashboard (unified inbox + AI sales assistant). The app lives entirely in `web-app/`.

### Path aliases

| Alias | Resolves to |
|-------|-------------|
| `@/*` | `web-app/src/*` |
| `@core/*` | `web-app/core/*` |
| `@db/*` | `web-app/supabase/*` |

`@db` stays `@db`, not `@supabase` — the folder is named `supabase/` because that's what the
Supabase CLI requires (`supabase/migrations/`, `supabase/config.toml`), but an import alias
called `@supabase/*` would collide with the real `@supabase/supabase-js` / `@supabase/ssr`
npm packages already used everywhere in this codebase.

### Layer stack

```
core/contracts/          Zod schemas + inferred TS types for all domain entities
core/repository/         BaseRepository<T> — generic Supabase CRUD with soft-delete
core/ai/                 generate() — typed client for the ml/ inference service
core/queue/              enqueueSuggestionJob()/drainDueSuggestionJobs() — pgmq wrapper
core/exceptions/         AppException.wrap() wraps every DB error with context
supabase/client.ts       Server-side Supabase clients (SSR + service role)
supabase/browser-client.ts  Browser Supabase client — Realtime only
supabase/migrations/     SQL, applied via `supabase db push` (Supabase CLI, project linked)
supabase/seed.ts         Inserts fixture data; run with `npm run seed`
src/app/(auth)/          Login + signup (email/password)
src/app/(app)/           Authenticated app: inbox, analytics, settings
src/app/api/webhooks/    Public, unauthenticated inbound webhooks (HMAC-verified)
src/app/api/jobs/        Internal endpoints called by pg_cron (shared-secret auth)
src/lib/format.ts        Date formatting — the DB stores instants, the view formats them
src/proxy.ts             Middleware; validates the Supabase session
src/types/index.ts       Re-exports all types from @core/contracts
scripts/                 Dev utilities (simulate-inbound.sh, drain-suggestions.sh)
```

### Which Supabase client

| Factory | Module | Auth | Use for |
|---------|--------|------|---------|
| `createSupabaseServerClient()` | `@db/client` | User session (cookies) | Everything behind login — RLS applies |
| `createSupabaseServiceClient()` | `@db/client` | `SUPABASE_SECRET_KEY` | Code with no session: the webhook. **No RLS** |
| `createSupabaseBrowserClient()` | `@db/browser-client` | User session (cookies) | Realtime subscriptions only |

The browser client lives in its own module for a build reason, not a stylistic one:
`@db/client` imports `next/headers`, so a client component importing from it drags
`next/headers` into the browser bundle and the build fails.

The service client is the dangerous one: without `auth.uid()`, `current_business_id()` is
NULL, the `business_id` column default is useless, and nothing stops a write landing in the
wrong tenant. Every query through it sets or filters `business_id` explicitly, resolved from
the channel — never from a request payload.

### Data flow pattern

Server pages (`page.tsx`) call a **service** (marked `"server-only"`) → pass typed data as props to a **client view** component (`'use client'`). Services instantiate `BaseRepository` directly; they never leak to the client.

Example: `inbox/page.tsx` → `InboxConversationListService.fetchConversations()` → `<InboxView initialConversations={…} />`.

### Contracts

Every domain entity has a contract file in `core/contracts/` that exports:
- A Zod schema (e.g. `ConversationContract.entitySchema`)
- Inferred TypeScript types (e.g. `Conversation`, `ConversationDoc`)
- Request/response schemas used to validate service output

`ConversationDoc` is the raw DB shape (no messages). `Conversation` extends it with `messages[]` joined by the service layer.

### AI — the `ml/` split

**No LLM is ever called from this repository.** Reply generation, conversation analysis, and
RAG over each tenant's catalog/policies all live in a separate Python service (`ml/`), hosted
independently. `core/ai/` is only a typed client that talks to it.

`ml/` connects to the **same Supabase database** with the `service_role` key, so it resolves
conversation history, `ai_settings`, and contact data itself. That is why `generate()` sends
references rather than data — shipping a growing message history over the wire on every
request is the thing that would make the copilot feel slow.

```
POST {AI_INFERENCE_URL}/generate     Authorization: Bearer {AI_INFERENCE_API_KEY}
→ { method, business_id, conversation_id?, params? }
← { data, usage: { model, prompt_tokens, completion_tokens, total_tokens } }
```

Two consequences worth remembering:

- `businessId` must be resolved **server-side** from the authenticated session. `ml/` uses
  `service_role` and therefore has **no RLS safety net** — a wrong tenant id there is not
  caught by the database.
- `core/ai/` never imports `@db/client`. `generate()` takes an optional `usageSink` callback
  and the caller decides how consumption reaches the `ai_usage` table, which keeps unit tests
  free of network and database.

Retries cover only network failures, timeouts, and 429/5xx — never other 4xx, which mean the
request itself is wrong and would fail identically on a second attempt.

**`ml/` doesn't exist yet.** With `AI_MOCK_MODE=true`, `generate()` skips the network call
entirely and returns canned-but-schema-valid data from `core/ai/mock-responses.ts` — it still
goes through `validateContract()` against the caller's schema, so the mock can never drift
from what a real response has to look like. This is what the Inbox suggestion card runs on
today (`inbox-chat-panel.service.ts`'s `fetchAISuggestion()`). Flip the flag off once `ml/` is
real; nothing else in `web-app` has to change.

### Inbound messages and reactivity

Customer messages arrive at `POST /api/webhooks/channel` — the only public, unauthenticated,
write-capable surface in the app. Its authentication is an HMAC signature
(`X-Hub-Signature-256`, Meta's scheme) over the **raw** body, so the body is read with
`request.text()` and only parsed after the signature checks out — reserializing parsed JSON
would change byte-for-byte and never match. `src/proxy.ts` returns early for `/api/webhooks`,
before `getUser()`: a provider has no session, and a 3xx redirect to `/login` reads as failure
to Meta's verification handshake.

Idempotency comes from the `channel_message_id` unique constraint (migration 004): providers
retry aggressively, and a duplicate delivery must be a no-op. The service catches Postgres
`23505` rather than checking-then-inserting, because two simultaneous deliveries are exactly
the race that check-then-insert loses.

**The webhook pushes nothing.** It writes a row, and the write *is* the broadcast: Supabase
Realtime streams Postgres changes to subscribed browsers (migration 007 publishes `messages`,
`conversations`, and `ai_suggestions`). Every write path propagates identically — the webhook,
the seller replying, the seed script, a future scheduler — and none of them need to know
anyone is listening. Postgres Changes applies RLS per subscriber, so the `*_tenant` policies
are also the socket's authorization; there is no second authorization layer to keep in sync.

The webhook doesn't generate a suggestion itself — it enqueues a job, in `after()` so the
provider still gets a fast 200. `ai_suggestions` being published is what makes the AI flow
itself reactive once generation does happen: the suggestion appears in an already-open panel
with no polling and no refetch.

`scripts/simulate-inbound.sh` posts a properly signed payload for local testing (`--new` for a
fresh lead, `--repeat` to prove idempotency). It signs rather than bypassing — a script that
skipped verification would exercise a path that does not exist in production.

### Suggestion queue — debounce and presence

A naive "generate on every inbound message" burns one LLM call per message even when a
customer sends three bubbles in ten seconds and only the last one matters. `core/queue/` fixes
this with two independent gates:

- **Debounce decides *when*.** `enqueueSuggestionJob()` deletes any job already queued for
  that conversation before adding a new one (`pgmq`, migration 008) with a delay
  (`sleep_seconds`) before it becomes visible. A burst of messages just keeps replacing the
  same pending job instead of accumulating several — this delete-then-send *is* the debounce.
- **Presence decides *whether*.** Checked at drain time, not enqueue time, so a seller who
  opens the conversation *in reaction to* the very message that triggered the job still counts
  as present. The open chat panel writes `conversations.last_viewed_at` every ~20s
  (`inbox-chat-panel.hook.ts`); `/api/jobs/drain-suggestions` skips generating if that
  timestamp isn't fresh — the seller opening the conversation later still gets one, through the
  ordinary cache-miss path in `fetchAISuggestion()`.

`pg_cron` drains the queue on a schedule — it runs *inside* Supabase's own Postgres, so there
is no worker process for this app to host. It calls `/api/jobs/drain-suggestions` over HTTP
via `pg_net`, authenticated with a shared secret (`INTERNAL_JOBS_SECRET`) that the cron job
reads from Supabase Vault by name, never as a literal value in the (git-tracked) migration.

**`pg_cron` cannot reach `localhost`.** The schedule only fires anything useful once the app
has a real deployed URL and the Vault secrets are set (a manual, uncommitted step — see
migration 008's comments). Until then it fires every 10s and no-ops harmlessly. Test the
pipeline locally by hand: `scripts/simulate-inbound.sh` to enqueue, then
`scripts/drain-suggestions.sh` to do what `pg_cron` would have done.

This queue is scoped to AI suggestions only — it is not a generic job system. T-009 (the
follow-up scheduler, still unbuilt) needs the same shape of infrastructure and can reuse the
`pgmq`/`pg_cron` pattern, most likely as its own queue, when that work starts.

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

Supabase (PostgreSQL), managed through the Supabase CLI — the project is linked
(`supabase link`), and `supabase/migrations/` is the CLI's own expected folder, so
`supabase db push` applies whatever hasn't run yet against the linked project. To set up a
fresh environment: `supabase link --project-ref <ref>`, `supabase db push`, then `npm run seed`.

Migrations 001–008 (the numbered names now live as CLI-timestamped files, e.g.
`20260813000001_initial_schema.sql`) were originally applied by hand in the SQL Editor, before
the project adopted the CLI — `supabase migration repair --status applied <version>` was run
once for each to reconcile the CLI's tracking table with what was actually already applied,
without re-running any of that SQL. Migrations from here on (009+) are created with
`supabase migration new <name>` and go through `db push` normally — no more copy-pasting into
the SQL Editor.

**A caution for anyone hand-editing an already-applied migration file:** several of the
early ones (003's `create policy`, 004's `alter table ... add column`) are not idempotent —
no `if not exists` / `drop ... if exists` guard. That was fine when they were pasted once by
hand, but it means `db push` cannot safely replay them from scratch on a database that already
has them; `migration repair` (bookkeeping only, no SQL execution) is the correct tool if the
CLI's tracked history and the real database ever drift apart again.

Timestamps are `timestamptz`. Never store display-formatted strings in a time column —
formatting belongs in `src/lib/format.ts`.

`conversations`, `messages`, and `follow_ups` use a `bigint generated always as identity`
primary key — never set `id` on insert, the database always generates it.
`conversations.channel_conversation_id` and `messages.channel_message_id` are separate,
nullable columns reserved for the external platform's own id (WhatsApp/Instagram/Facebook)
once real channel integration exists — they intentionally decouple our internal id from
theirs.

If `SEED_DEV_EMAIL` / `SEED_DEV_PASSWORD` are set, the seed also provisions (or resets the
password of) that user and links its profile to the seeded business — otherwise a fresh
environment has fixture data but no account that can see it, since a normal signup creates
its own separate, empty business via `handle_new_user`. Real credentials for a given
environment belong in `docs/login-credentials.txt` (gitignored), never committed.

### Required env vars (`web-app/.env.local`)

Copy `web-app/.env.example` and fill it in.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=       # server-only; bypasses RLS. Never prefix with NEXT_PUBLIC_
AI_INFERENCE_URL=          # base URL of the ml/ inference service
AI_INFERENCE_API_KEY=      # server-only; auth to ml/. Never prefix with NEXT_PUBLIC_
AI_MOCK_MODE=              # "true" skips ml/ entirely and returns canned, schema-valid data
CHANNEL_WEBHOOK_SECRET=    # server-only; HMAC secret for the inbound webhook
CHANNEL_VERIFY_TOKEN=      # server-only; echoed on the provider's GET handshake
INTERNAL_JOBS_SECRET=      # server-only; shared secret for /api/jobs/* (pg_cron calls these)
```

`SUPABASE_SECRET_KEY` is used only by `npm run seed`. Prefixing it with `NEXT_PUBLIC_` would
publish unrestricted database access in the browser bundle.

`AI_INFERENCE_*` are read lazily by `core/ai/client.ts`, so `next build` does not require
them — only a runtime call to `generate()` does.

### Soft deletes

`BaseRepository.delete()` sets `deleted_at` (soft). `hardDelete()` removes rows. All `findAll` / `findById` queries filter `deleted_at IS NULL` by default.
