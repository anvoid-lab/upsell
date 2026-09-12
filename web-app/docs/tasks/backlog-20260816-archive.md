# VendAI — Engineering Backlog

> **Status snapshot (2026-08-16):** the app is a high-fidelity prototype wired to a real
> Supabase database. All three screens (Inbox, Analytics, Settings) read live data through a
> clean layer stack (Zod contracts → `BaseRepository` → `server-only` services → client views).
> `npm run build` and `tsc --noEmit` both pass.
>
> **T-005 was replanned twice (2026-08-16):** first from a separate `ml/` Python service
> (never built) to a LangGraph.js agent with tools running inside `web-app`. Then, once real
> testing started, the tools themselves came out: `web-app` now knows `businessId`/
> `conversationId` before the graph even runs, so a tool-calling loop just to fetch
> unconditional context (history, contact, settings) was 2–3 LLM round trips paying for a
> decision the model never actually had to make. The graph is now two nodes — `prefetch`
> (plain DB reads) → `finalize` (one structured-output call) — and RAG moved out entirely to a
> future `ml/` service, once real testing also showed the configured OpenAI-compatible endpoint
> (Ollama Cloud) has no embeddings API to retrieve against anyway. See CLAUDE.md's
> "AI — `web-app/ai/` (T-005)" section for the current architecture. What does **not** exist
> yet is a messaging channel (only the receiving half — T-010b) or `ml/` itself (RAG is fully
> deferred to it; `ai_documents`/`match_business_documents` exist as dormant Postgres
> infrastructure for whenever it's built).
>
> **Progress:** T-024, T-001, T-003, T-004, T-005, T-006, T-011, T-012, T-013, T-026, T-027,
> T-028, T-029 done (T-002 superseded by T-001; T-004's `ml/`-client design superseded by
> T-005's replan); T-010b done as part of T-027; T-016 and T-021 partly done; T-025 on hold.
> Every P0 is now closed.
>
> Migrations now live in `supabase/migrations/`, applied via `supabase db push` — see T-029.
>
> **Infra note:** `pgmq` + `pg_cron` (T-028) are enabled and proven — reaching due work without
> a hosted worker process. T-009 (follow-up scheduler) is the next consumer of that pattern.
> Next up: **T-007** — conversation analysis, the other half of T-004's original scope, now
> also implemented in `web-app/ai/` rather than `ml/`.

---

## Product framing

VendAI is a **sales copilot** for businesses that sell through messaging apps
(WhatsApp, Instagram, Facebook).

Its job is to help the business **send the right reply at the right moment** so that an
interested lead actually converts into a paying customer. The AI reads the conversation,
understands what the customer wants and where they hesitate, and proposes a reply that
moves the sale forward — applying proven sales technique (urgency, upsell, social proof,
objection handling, cart recovery).

The seller stays in control: VendAI drafts, the seller approves and sends. It never
replaces the seller's voice or relationship with the customer.

Automatic follow-up when a lead goes silent is **one high-value case** of this copilot,
not the whole product.

### Two modes to support

| Mode | Trigger | Who sends |
|------|---------|-----------|
| **Assist** (primary) | Seller opens a conversation | AI drafts → seller edits → seller sends |
| **Autopilot** (opt-in) | Lead goes silent for N hours | AI drafts → scheduler sends automatically |

---

## Priority legend

| Tag | Meaning |
|-----|---------|
| **P0** | Blocker — unsafe or broken; fix before anything else ships |
| **P1** | Core product — without this there is no VendAI |
| **P2** | Needed for a real multi-customer launch |
| **P3** | Quality, polish, and hardening |

## Status legend

| Mark | Meaning |
|------|---------|
| ☐ | Not started |
| ◐ | In progress |
| ☑ | Done |
| ⊘ | Deliberately deferred — see the note on the task |

---

## P0 — Security and correctness blockers

### ☑ T-001 · Fix the authentication bypass — DONE (2026-08-14)
**File:** `web-app/src/app/(auth)/login/actions.ts`

`requestMagicLinkAction` never called Supabase. It accepted any email string, called
`createSession(email)`, and redirected to `/inbox` — anyone could sign in as anyone.

Deferred earlier because Supabase's built-in mailer restricts delivery, blocking magic-link
sign-in during development. **Password auth removes that constraint entirely: it sends no
email.** T-012 then forced the issue — RLS keys off `auth.uid()`, which needs a real Supabase
session.

**Delivered:**
- `signInAction` / `signUpAction` / `signOutAction` using `supabase.auth`. Sign-in failures
  return one generic message so the form can't be used to probe which emails exist.
- **The custom session layer is gone** (`src/lib/session.ts`, `vendai_session`, the OTP and
  check-email routes). Two auth layers was not merely redundant — it produced exactly the bug
  reported this session: the cookie said "authenticated", Supabase knew nothing, RLS returned
  zero rows, and the app rendered empty instead of redirecting to login.
- `src/proxy.ts` validates via `supabase.auth.getUser()` (server-verified) rather than
  `getSession()` (reads a client-supplied cookie).
- Sidebar shows the real business and email, with a sign-out button, replacing hardcoded
  "João Dias / Admin".

**Supersedes T-002:** `SESSION_SECRET` no longer exists — the module that used it is gone.

**Still open:** confirm whether "Confirm email" is enabled in the Supabase dashboard. If it
is, `signUp` returns no session and new users cannot enter until they confirm — which
reintroduces the email-delivery constraint for signup (sign-in is unaffected).

---

### ☑ T-002 · Move `SESSION_SECRET` into the environment — DONE, later superseded
**File:** `web-app/src/lib/session.ts`

The JWT signing key fell back to the literal
`"vendai-dev-secret-change-in-production"` because `SESSION_SECRET` was absent from
`.env.local`. Any deploy inheriting this fallback lets an attacker forge session cookies.

**Delivered:**
- Fallback removed. `getSecret()` throws if `SESSION_SECRET` is missing or under 32 chars.
- The secret is read lazily and cached, so `next build` does not require it — only runtime does.
- `getSession()` reads the secret *outside* its `try/catch`. The catch previously swallowed
  everything and returned `null`, which would have turned a missing secret into a silent
  redirect to `/login` instead of a visible failure.
- A 32-byte secret is set in `.env.local`, and `web-app/.env.example` documents it.

**Verified:** with `SESSION_SECRET=` the server returns HTTP 500 and logs the explicit error;
with it set, sign-in creates a session and the Inbox loads.

> **Superseded by T-001 (2026-08-14).** The custom session layer was removed in favour of
> Supabase sessions, which RLS requires. `src/lib/session.ts` and `SESSION_SECRET` no longer
> exist. The finding still stands as a rule: never fall back to a hard-coded secret.

---

### ☑ T-003 · Remove stale MongoDB configuration — DONE (2026-08-14)

Dead since the Supabase migration, and actively misleading anyone setting up the project.
The footprint was wider than first scoped:

- `web-app/.env.local` — `MONGODB_URI` and `MONGODB_DB` removed
- `docker-compose.yml` — deleted (it defined nothing but the Mongo container)
- `.claude/launch.json` — dropped the "MongoDB (Docker)" configuration, which pointed at the
  compose file that no longer exists
- `AGENTS.md` — was a stale copy of the pre-migration `CLAUDE.md`, documenting the Mongo
  driver, `mock-data.ts`, and a `BaseRepository` signature that no longer exists. Now synced
  with `CLAUDE.md`.
- `CLAUDE.md` — dropped the reference to the deleted compose file; env section now points at
  `.env.example`

**Note:** `DB_PASS` is still in `.env.local` and is referenced nowhere in the codebase. Left
in place — it is probably the Supabase Postgres password kept for `psql` access. Remove it if
that is not the case.

---

### ☑ T-026 · Fix "sending a message/note always fails", decouple ids from channel ids — DONE (2026-08-14)

**Reported:** creating a note threw `AppException: Unknown error` with no useful detail.

**Root cause:** `messages.id` and `follow_ups.id` were `text primary key` with **no default** —
whatever inserted a row had to invent an id. `InboxChatPanelService.sendMessage()` and
`scheduleFollowUp()` never did, so every single send/note/schedule from the Inbox UI failed
with a `NOT NULL` violation. This was a pre-existing bug, not introduced this session — the
Notes/Reply composer had apparently never been exercised end-to-end before.

**A second bug hid the first one:** `AppException.wrap()` treated anything that wasn't
`instanceof Error` as an unhelpful `"Unknown error"`. Supabase/PostgREST errors are plain
objects, not `Error` instances, so every database error in the app — not just this one — was
being flattened to that generic message. Fixed generally: `wrap()` now detects an object with
a string `.message` (`code: "DATABASE_ERROR"`) and surfaces it, covered by a new test in
`app.exception.test.ts`.

**Fixing it properly meant revisiting the id strategy, not just adding `crypto.randomUUID()`
at the two call sites.** A unified inbox will eventually receive messages/conversations that
already carry a platform-issued id (WhatsApp `wamid`, Instagram/Facebook message ids) — an
app-generated id doesn't fit that shape, and a bare autoincrement column would have no room
for it either. **Migration 004** (`004_autoincrement_ids_and_channel_ids.sql`, applied to the
`Avoid Upsell` project) resolves this by decoupling the two concerns:

- `conversations.id`, `messages.id`, `follow_ups.id` → `bigint generated always as identity`.
  The app never sets these; the database always does.
- `conversations.channel_conversation_id`, `messages.channel_message_id` → new nullable `text`
  columns, unique, for the external platform's own id once T-010 exists. Not populated or
  wired into the UI yet.
- FK columns (`messages.conversation_id`, `follow_ups.conversation_id`,
  `ai_suggestions.conversation_id`) changed to `bigint` to match.
- Existing seed data was truncated as part of the migration (disposable fixtures) and
  regenerated afterward.

**Follow-on changes:**
- Contracts (`conversation`, `message`, `follow-up`, `ai-suggestion`) coerce `id`/`conversation_id`
  to string (`z.coerce.string()`) — PostgREST may return a bigint as a JS number or string
  depending on magnitude, and the rest of the app treats ids as opaque strings throughout
  (`Record<string, …>` keys, comparisons). Coercion normalizes either shape.
- `database/seed.ts` rewritten: conversations are inserted one at a time (not in a single
  bulk insert) so each iteration's database-generated id can be captured immediately and used
  to wire up that conversation's messages, follow-ups, and AI suggestion — bulk insert +
  `RETURNING` order isn't a safe way to recover per-row correspondence.
- `tests/integration/multi-tenancy.rls.test.ts` updated: two tests previously set an explicit
  `id` on a `conversations` insert, which now fails outright (`generated always as identity`
  rejects a caller-supplied value). Fixed to read the database-generated id back instead.

**A third, more serious bug surfaced once the above was fixed and actually exercised:**
`InboxView` (`inbox-view.tsx`) defaulted `selectedId` to the **hardcoded, never-valid**
literal `'c1'` — leftover placeholder that never matched real seeded data (real ids were
always `conv-1`-style, and are now integers). Querying a `text` column for a nonexistent id
silently returned zero rows, so this was invisible before. With `id` now `bigint`, the same
query throws `invalid input syntax for type bigint: "c1"` — meaning **every single load of the
Inbox page** started failing three ways in parallel (conversation fetch, AI suggestion fetch,
message fetch) before this fix. Changed the default to `null`, which the UI already handles
correctly (renders the existing "Select a conversation" empty state).

**Verified end-to-end:** reproduced the exact reported flow (Reply → Note toggle → Add note)
in-browser against the live database — the note now appears in the thread and lands correctly
in `messages` with the right `conversation_id`. Confirmed via server logs that the `"c1"`
error no longer occurs after the `inbox-view.tsx` fix. Full re-verification after: `tsc`,
23 unit tests, 4 live-database RLS integration tests, `npm run build`.

---

## P1 — The core product

### ☑ T-004 · Add an LLM provider layer — DONE (2026-08-14), design superseded by T-005 (2026-08-16)
**New:** `web-app/core/ai/`, `core/contracts/ai-usage.contract.ts`, `database/migrations/005_ai_usage.sql`

> **Superseded:** the `ml/`-client design below was replaced when T-005 was replanned —
> `core/ai/` was deleted, and `web-app/ai/` calls OpenAI directly instead. What's still true
> and unchanged: `ai_usage`, its contract, and its RLS policy (this section's actual delivered
> schema work). Left as-is below for history; see CLAUDE.md's "AI — `web-app/ai/` (T-005)"
> section for what replaced the client architecture.

No LLM was integrated anywhere in the codebase. The scope was reframed during planning: **no
LLM is called from this repository at all.** RAG, conversation analysis, and reply generation
move to a separate Python service (`ml/`), hosted independently and sharing the same Supabase
database (via `service_role`) so it can resolve conversation history and tenant knowledge
itself. `core/ai/` is therefore a thin, typed client for that service, not a provider SDK
wrapper — which is what actually makes the app provider-agnostic: swapping the LLM, the
embedding model, or the vector store inside `ml/` never touches `web-app`.

**Delivered:**
- `core/ai/client.ts` — lazily reads `AI_INFERENCE_URL` / `AI_INFERENCE_API_KEY`, so
  `next build` does not require them; throws `AI_CONFIG_ERROR` on first use if absent.
- `core/ai/generate.ts` — `generate<T>({ method, businessId, conversationId?, params?,
  responseSchema, usageSink? })`. Sends a small reference payload over JSON/HTTP (single
  RPC-style `POST /generate`; gRPC rejected — the payload is a handful of scalars, so codegen
  tooling buys nothing next to LLM inference time) and validates the response against the
  caller's Zod schema.
- Retry only on network failure, timeout (10s), and 429/5xx — never other 4xx, which are
  malformed requests that would fail identically on a second attempt.
- Errors: `AI_CONFIG_ERROR`, `AI_INFERENCE_ERROR`, `AI_INFERENCE_UNAVAILABLE`,
  `AI_GENERATION_INVALID_OUTPUT`.
- Migration 005 — `ai_usage` table with the same `current_business_id()` default and RLS
  policy as every other domain table. Records failures as well as successes: a failed call
  still burned tokens, and omitting it would make the provider's bill never reconcile.
- `core/ai/` never imports `@db/client` — usage reaches the table through a caller-injected
  `usageSink`, keeping the 9 new unit tests free of network and database.

**Design note for whoever picks up T-005/T-007:** `businessId` must be resolved server-side
from the authenticated session. `ml/` connects with `service_role` and bypasses RLS, so a
wrong tenant id there is *not* caught by the database — every query in `ml/` has to filter
`business_id` by hand.

**Not verified end-to-end:** no `ml/` service exists yet, so `generate()` has never spoken to
a real inference endpoint. That happens when T-005/T-006 wire a real caller.

---

### ☑ T-005 · Build the reply-suggestion engine — DONE (2026-08-16), replanned twice
**Depends on:** T-004 (schema only — its `ml/`-client design is retired) ·
**Implemented in:** `web-app/ai/` (LangGraph.js + a chat model, directly), not `ml/`

Given a conversation, produce a reply the seller can send. This is the heart of the product.

**Replanned twice before landing.** First from a separate `ml/` Python service (routed over
HTTP) — never built, plan changed before it was. Then, mid-implementation, from a tool-calling
agent to a two-node prefetch → finalize graph: `ReplySuggestionService` already knows
`businessId`/`conversationId` before the graph runs, and the context a reply needs (recent
messages, contact, business settings) is unconditional — nothing for a model to usefully
decide by fetching it itself via tools, just 2–3 extra LLM round trips paying for a decision
that was never real. RAG (retrieval-augmented generation over catalog/policy documents) moved
out to a future `ml/` service in the same pass, once live testing showed the actually-configured
OpenAI-compatible endpoint (Ollama Cloud) serves chat completions but no embeddings API at all
— ingestion and retrieval are the same underlying capability, so both stay together in `ml/`
rather than splitting the query half into `web-app` with nothing to populate the store. Full
architecture in CLAUDE.md's "AI — `web-app/ai/` (T-005)" section; the short version:

- `web-app/ai/graph/reply-suggestion.graph.ts` — a two-node `StateGraph`: `prefetch` (plain
  parallel DB reads via `ai/context/fetch-reply-context.ts` — last 5 messages, contact profile,
  `ai_settings`, all `business_id`-scoped explicitly since the cron path has no RLS) → `finalize`
  (the single LLM call, `.withStructuredOutput()`). One model call per run, not three.
- The response shape is unchanged from every earlier version of this plan:
  `core/contracts/reply-suggestion.contract.ts` — `{ candidates: [{ message, technique,
  rationale }] }`, `technique` being the same enum as `follow_ups.type`.
- `AI_MOCK_MODE=true` still short-circuits to canned, schema-valid data
  (`web-app/ai/graph/reply-suggestion.mock.ts`) — this is what the Inbox suggestion card runs
  on by default; nothing about the caller changed.
- `ai_documents` / `match_business_documents` (migrations `20260816000001`/`20260816000002`)
  are **dormant** — plain Postgres, left in place for `ml/` to use directly once it exists.
  Nothing in `web-app` reads or writes them; the `retrieve_context` tool and
  `supabase/seed-ai-documents.ts` that used to exercise them were removed.
- The interactive "regenerate" button still streams via `POST /api/ai/reply-suggestion`
  (`@ai-sdk/langchain` + the `ai` package), though with no tool loop there's no
  per-token/tool-call progress to show anymore — the client sees the prefetch→finalize
  transition, then the finished result. The cron/drain path still calls the graph with a
  plain, non-streaming `.invoke()` — no UI to stream to there.

**Done when:** opening a conversation in the Inbox produces a genuinely generated draft that
reflects that specific conversation, and switching conversations produces a different one. ✓
with `AI_MOCK_MODE=true` (deterministic per-conversation mock). Real-model verification is in
progress against Ollama Cloud (`OPENAI_BASE_URL=https://ollama.com/v1`,
`AI_CHAT_MODEL=deepseek-v4-flash:cloud`) — the pgvector migration is applied to the linked
Supabase project and seed data is loaded; browser click-through of the real (non-mock)
generation path was the last step underway when this entry was written.

---

### ☑ T-006 · Replace the static AI suggestion with live generation — DONE (2026-08-14)
**Files:** `web-app/src/app/(app)/inbox/inbox-chat-panel.service.ts`,
`inbox-chat-panel.hook.ts`, `inbox-chat-panel.tsx`, `database/seed.ts`
**Depends on:** T-005 — now genuinely wired to the real (LangGraph) engine, not a stand-in

`fetchAISuggestion()` no longer reads a fixed row from `ai_suggestions`. It calls
`ReplySuggestionService.generate()`, which (since T-005's replan) calls
`invokeReplySuggestionGraph()` in `web-app/ai/`, resolving `business_id` server-side via the
existing `currentUserService`. `ai_suggestions` is now written, never read, as an audit log
(migration 006 adds the `rationale` column); the seed script no longer inserts fixture rows
there.

Along the way, fixed a real bug found while wiring this up:
`inbox-chat-panel.hook.ts` fetched the conversation and the suggestion in a single
`Promise.all` with no error handling — a suggestion failure meant the conversation itself
never finished loading either. They're now independent fetches, each with its own loading
state and failure handling, so `fetchAISuggestion()` returning `null` only empties the
suggestion card and never blocks the rest of the panel.

**Delivered:**
- Real loading state on the suggestion card (`isSuggestionLoading`), separate from the
  conversation's own.
- Edit-before-send unchanged; the card now also shows the technique badge and rationale line
  T-005's output carries, instead of just the message.
- Generation failure returns `null` and leaves the panel intact — covered by
  `inbox-chat-panel.service.test.ts`.
- Token usage from every call, success or failure, is written to `ai_usage` (T-004) through a
  caller-supplied `usageSink`.

**Caveat:** with `AI_MOCK_MODE=true` (the default), this runs against
`web-app/ai/graph/reply-suggestion.mock.ts` rather than a real OpenAI call. Nothing here needs
to change to use the real thing — only the flag (and a real `OPENAI_API_KEY`).

---

### T-007 · Conversation analysis — intent, objection, and buying stage
**Depends on:** T-004, T-005 · **Implemented in:** `web-app/ai/` (LangGraph.js), not `ml/`

For the copilot to suggest the *right* reply it must first understand where the sale stands.
Classify each conversation into a buying stage (browsing → asking → objecting → ready →
lost), extract the product of interest, and detect the specific objection blocking the sale
(price, trust, timing, availability).

This classification drives which sales technique T-005 applies, and it is what makes the
suggestion feel targeted instead of generic. Following T-005's replan, this is a second graph
in `web-app/ai/` (its own `StateGraph`), not a Python service — the same pivot T-005 already
made, so there's no separate architecture decision left to make here. T-005's tools were
removed (see its entry) in favor of a plain prefetch step — this graph should follow the same
pattern (a prefetch node doing direct DB reads, likely sharing `ai/context/fetch-reply-context.ts`'s
message-fetching logic or a sibling of it) rather than reintroducing tool-calling.

**Done when:** stage, product interest, and objection are persisted per conversation, refresh
as new messages arrive, and are visible in the details panel.

---

### T-008 · Silence detection
**Depends on:** T-007, T-014

Detect when a lead who showed buying intent has stopped replying past the configured
threshold. Today `ai_scheduled` is a static boolean from the seed with no logic behind it.

**Done when:** a periodic job flags conversations that went silent after showing intent, and
`ai_scheduled` reflects real detected state.

---

### T-009 · Follow-up scheduler / worker
**Files:** `web-app/src/app/(app)/inbox/inbox-chat-panel.service.ts:58`

`scheduleFollowUp()` writes a row with `status: "scheduled"` and a `scheduled_for` timestamp —
and nothing ever reads it. No cron, no worker, no queue. **No follow-up has ever been sent.**
Rows never leave `scheduled`.

**Done when:** a scheduled job claims due follow-ups (safely, without double-sending under
concurrency), dispatches them through the channel layer, and transitions them to `sent` or
`failed` with a retry policy and an error reason recorded.

---

### T-010 · Meta channel integration — WhatsApp, Instagram, Facebook
**File:** `web-app/src/app/(app)/settings/settings-channels.service.ts:38`

`connectChannel()` only flips a `connected` boolean on a database row. There is no OAuth, no
webhook receiver, and no send path. `sendMessage()` inserts a row into `messages` — nothing
is ever delivered to an actual customer.

Sub-tasks:
- **T-010a** — Meta OAuth flow; store per-business tokens encrypted, handle refresh
- **☑ T-010b** — Webhook endpoint receiving inbound messages, with signature verification, idempotent delivery handling, and normalisation into the `messages`/`conversations` schema — **DONE (2026-08-15)**, see T-027
- **T-010c** — Outbound send adapter per platform, with delivery-status tracking
- **T-010d** — WhatsApp Business template-message approval flow (required to open a conversation outside the 24-hour customer-service window — this constrains how follow-ups can work and needs designing early)

**Note:** Meta app review is the longest-lead item in the whole project. Start it in parallel
with T-004/T-005 rather than after them.

**Done when:** a real message from a real WhatsApp account appears in the Inbox, and a reply
sent from the Inbox arrives on the customer's phone.

---

## P2 — Required for a real launch

### ☑ T-011 · Multi-tenancy — DONE (2026-08-14)

No table carried a `business_id` or `user_id`. Every signed-in user saw the same
conversations, contacts, and settings — the app could not serve two customers.

**Delivered** (`database/migrations/003_multi_tenancy_and_rls.sql`, applied):
- `businesses` table; `profiles.business_id` links a user to their tenant.
- `business_id` on all six domain tables, backfilled into one business
  ("Shop & Go Luanda") along with the existing auth user, so nothing was orphaned.
- `NOT NULL` after backfill, plus an index on every `business_id`.
- Each column defaults to `current_business_id()`, so **the repository layer needs no
  changes** — inserts are stamped by the database rather than by application code that could
  forget.
- `handle_new_user` trigger: each signup creates its own business and profile, so a new
  account is a new tenant.

**Follow-up (2026-08-14):** that trigger created a real gap: `npm run seed` populates a
business, but a fresh environment has no account linked to it — normal signup gives you your
own separate empty business, not the seeded one. `database/seed.ts:ensureDevUser()` now
optionally provisions a dev login (`SEED_DEV_EMAIL`/`SEED_DEV_PASSWORD` in `.env.local`) and
re-links it to the seeded business on every run, deleting whatever orphan business the trigger
created for it in the process. Used to reset the password on the pre-existing account in this
project; credentials recorded in `docs/login-credentials.txt` (gitignored, never committed —
verified with `git check-ignore`).

---

### ☑ T-012 · Enable Row Level Security — DONE (2026-08-14)

Migration 001 ran `disable row level security` on all seven tables. RLS had since been enabled
in the dashboard, but with **zero policies** — which is default-deny, so the app showed no data
at all.

**Delivered:** 8 policies (one per table), keyed on `current_business_id()`, a
`SECURITY DEFINER` function mapping `auth.uid()` → `profiles.business_id`. `SECURITY DEFINER`
is required: a policy on `profiles` that reads `profiles` would recurse infinitely.
No policy exists for `anon` — no session, no data.

**Verified against the live database**, impersonating roles via `request.jwt.claims`:

| Scenario | Result |
|---|---|
| Real user, own tenant | 6 conversations |
| Different tenant | 0 rows across *every* table |
| Cross-tenant insert | `new row violates row-level security policy` |

The write test matters as much as the read test: `WITH CHECK` is what stops a tenant from
injecting rows into someone else's business.

**Note:** `npm run seed` now requires `SUPABASE_SECRET_KEY` — the publishable key can no
longer write.

---

### ☑ T-013 · Migrate text timestamps to `timestamptz` — DONE (2026-08-14)

`last_message_at`, `messages.timestamp`, `follow_ups.scheduled_for`, `follow_ups.sent_at`,
and `channels.connected_at` were all `text` columns holding display-formatted strings
(`"14:32"`, `"20 Jun 2026"`). They could not be sorted or range-queried.

**Delivered:**
- `database/migrations/002_timestamps_to_timestamptz.sql`, applied to the `Avoid Upsell`
  cloud project. It uses a tolerant cast helper: values like `"23:24"` carry no date and are
  unrecoverable, so they fall back to the row's `created_at` rather than failing the migration.
  `NOT NULL` is preserved throughout.
- Three indexes the new types make possible: `follow_ups_due_idx` (partial, for the T-009
  scheduler sweep), `conversations_last_message_at_idx`, `messages_conversation_timestamp_idx`.
- Contracts coerce to `Date` (`z.coerce.date()`); `Conversation`, `Message`, `FollowUp`,
  `ChannelConnection` and `Contact` now carry real instants.
- `BaseRepository` gained an `orderBy` option — without it the new indexes were unused and
  message order still depended on insertion order. Conversations sort by `last_message_at desc`,
  messages by `timestamp asc`.
- All display formatting moved to `src/lib/format.ts` (`formatTime`, `formatDate`,
  `formatListTimestamp`, `formatRelative`), consumed by the view layer.
- `sendMessage()` now also bumps the conversation's `last_message`/`last_message_at`, so a
  reply moves the conversation to the top of the list.
- Seed emits real instants.

**Verified:** conversation list ordered by real activity; message day separators
(YESTERDAY/TODAY) work for the first time; scheduled follow-up renders "in 2 hours";
`scheduled_for <= now()` — the exact query T-009 needs — returns correctly against the DB.

**Note on hydration:** these formatters are timezone-dependent, so server and client can render
different strings for the same instant. Every element using them carries
`suppressHydrationWarning`. Documented in `src/lib/format.ts`.

**Not migrated:** `contact.first_contact` lives inside the `conversations.contact` JSONB and
stays an ISO string — JSONB has no temporal type. It is coerced to `Date` at the contract
boundary.

---

### T-014 · Background job infrastructure
**Blocks:** T-008, T-009

There is no scheduled-execution mechanism of any kind. Pick and wire one (Supabase
`pg_cron`, an external scheduler hitting a protected route, or a queue), with authentication
on the trigger, observability, and safe behaviour when a run overlaps the previous one.

**Done when:** a scheduled job runs reliably in the deployed environment and its outcomes are
visible.

---

### T-015 · Wire AI settings into generation
**File:** `web-app/src/app/(app)/settings/settings-content.tsx`
**Depends on:** T-005

The Settings screen persists `tone`, `language`, `follow_up_delay_hours`, and four technique
toggles (`use_urgency`, `use_upsell`, `use_social_proof`, `use_cart_recovery`) — and nothing
reads them. They are currently a UI that does nothing.

**Done when:** each setting demonstrably changes generated output, and the delay setting
drives silence detection.

---

### ◐ T-016 · Real analytics
**File:** `web-app/src/app/(app)/analytics/analytics-overview.service.ts`

- ☑ **Follow-up counts were always zero.** The service read `c.follow_ups` off each
  conversation, but `follow_ups` is a separate table and never appears in `select *` on
  `conversations` — so `allFollowUps` was permanently empty. Fixed 2026-08-14 by querying the
  `follow_ups` repository directly. (An earlier commit had added a `?? []` guard, which stopped
  the crash but locked the KPI at 0 — that guard is now gone.)
- ☐ `chart_data` still fabricates the 7-day series arithmetically from current totals. Now
  unblocked by T-013: real timestamps exist, so it can aggregate for real.
- ☐ Every KPI delta is still hard-coded to `"+0"` with `delta_positive: true`.
- ☐ The "Top products" table is entirely hard-coded fixture markup in the view.

**Done when:** the chart aggregates over real timestamps, deltas compare against the prior
period, and no panel renders invented numbers.

---

### T-017 · Conversion attribution

The product's entire promise is "we recover sales you would have lost." Nothing currently
measures that. Track which AI-assisted replies and follow-ups led to a conversion, so the
business can see revenue attributable to VendAI.

**Done when:** the seller can mark a conversation as won, and analytics show conversions
attributable to AI-assisted messages versus unassisted ones.

---

## P3 — Quality and hardening

### ◐ T-018 · Test suite

**Delivered (2026-08-14):** Vitest configured (`web-app/vitest.config.mts`), `*.test.ts`
co-located with the code they test. 22 unit tests: `format.ts`, `AppException`,
`validateContract`, `MessageContract`'s date coercion (regression-guards the exact string
migration 002 made invalid — `"23:24"`), and `current-user.service`'s business-name
resolution (both shapes Supabase can return a to-one join in).

Also added `tests/integration/`, excluded from `npm run test` and run separately via
`npm run test:integration` (needs `.env.local`). Its one suite so far automates the RLS
verification done manually during T-012 — against the real `Avoid Upsell` project, not a
mock, because RLS can't be meaningfully verified against one:
- a fresh tenant starts with zero rows in every domain table
- it cannot read another business's row by id
- it cannot insert into another business (`WITH CHECK` rejects it)
- it can insert and read within its own business, with `business_id` stamped by the column
  default rather than application code

It creates and deletes its own throwaway tenant per run; verified no residue is left behind.

**Still open:** `BaseRepository` itself is untested (would need a fake PostgREST query
builder, or run against a Supabase local/test instance — the live-project pattern above
doesn't fit something exercised on every commit). No tests yet for the server actions or the
scheduler once T-009 exists. Coverage reporting isn't configured.

### T-019 · Error handling and user-facing failures
`AppException.wrap()` gives good server-side context, but there is no error boundary and no
user-facing recovery path. A failed Supabase call currently surfaces as a broken page.

### T-020 · Rate limiting and cost controls
Once T-004 lands, every conversation view can trigger a paid LLM call. Add per-business
quotas, caching of generated suggestions, and a spend ceiling before this is exposed to real
traffic.

### ◐ T-021 · Optimistic UI for message sending
`sendMessage()` round-trips to the server before the message appears. On a mobile connection
in Angola this will feel broken. Render optimistically and reconcile.

> **Reconciliation half done (2026-08-15, T-027).** `sendMessage()` now returns the created
> row and the panel appends by its real bigint id, so the Realtime echo of the seller's own
> message is recognised and ignored instead of rendering a second bubble. What remains is the
> optimistic part: rendering *before* the round-trip, with a pending state and a rollback
> path if the write fails.

### T-022 · Empty and onboarding states
Every screen assumes seeded data exists. A newly signed-up business with zero conversations
and zero connected channels currently sees empty panels with no guidance toward connecting a
channel.

### T-023 · Pagination
`fetchConversations()` calls `findAll()` with no limit, then joins every follow-up in memory.
`BaseRepository.paginate()` already exists and is unused. This breaks at a few thousand
conversations.

### ⊘ T-025 · Repair the lint script — ON HOLD (2026-08-14)
**File:** `web-app/package.json`

`npm run lint` calls `next lint`, which was **removed in Next.js 16**. The command fails with
`Invalid project directory provided, no such directory: .../web-app/lint`. No linting has run
on this project since the upgrade, and `eslint-config-next` is still pinned to `15.3.3` while
Next is on `16.2.9`.

> **Attempted and reverted (2026-08-14).** Upgraded `eslint-config-next` to `16.2.9` and
> switched to a flat `eslint.config.mjs` calling `eslint .` directly — it worked, but surfaced
> 13 real errors across the recent Inbox refactor (mostly `react-hooks/set-state-in-effect` —
> `setState` called synchronously inside `useEffect` in `inbox-chat-panel.tsx`,
> `inbox-chat-panel.hook.ts`, `inbox-conversation-list.tsx` — plus a couple of unescaped
> quotes and a missing `key` prop). Fixing those was judged out of scope for a lint-tooling
> task, so the decision was to keep using `next lint` for now and revisit later. All changes
> (`eslint.config.mjs`, the `package.json` script, the dependency bump) were rolled back;
> `eslint-config-next` is back on `15.3.3` and `npm run lint` still fails as described above.

**Done when:** the script invokes the ESLint CLI directly against a flat config, the Next
config package matches the installed Next major, and `npm run lint` passes on a clean tree —
which will also require fixing the `set-state-in-effect` findings above.

---

### ☑ T-024 · Commit the in-progress Inbox refactor — DONE (2026-08-14)
~836 uncommitted lines across `inbox-chat-panel.tsx`, `inbox-conversation-list.tsx`,
`inbox-details-panel.tsx`, and `inbox-view.tsx`, plus a `CLAUDE.md` rewrite. Land this before
starting new work to avoid conflicts.

---

### ☑ T-027 · Inbound webhook + reactive inbox — DONE (2026-08-15)
**New:** `src/app/api/webhooks/channel/`, `use-realtime-inbox.hook.ts`,
`reply-suggestion.service.ts`, `migrations/007`, `scripts/simulate-inbound.sh`

Closes the loop the AI layer was missing: nothing ever fed it. Messages only entered through
`npm run seed`, and the UI never noticed changes anyway.

**Delivered:**
- `POST /api/webhooks/channel` — public, HMAC-verified (`X-Hub-Signature-256` over the raw
  body), idempotent via the `channel_message_id` unique constraint (catches `23505` rather
  than check-then-insert, which loses the concurrent-delivery race). Creates contact +
  conversation for a first-time lead. `GET` handles the provider verification handshake.
- Suggestion generation in `after()`, so the provider still gets a fast 200.
  **Superseded by T-028** — `after()` now enqueues instead of generating directly.
- Migration 007 publishes `messages`, `conversations`, `ai_suggestions` to
  `supabase_realtime`. The webhook pushes nothing — the write is the broadcast, and RLS is
  the socket's authorization.
- `scripts/simulate-inbound.sh` (`--new`, `--repeat`) signs properly rather than bypassing.
- Entrance motion (`animate-fade-in`, already in the Tailwind config and unused) on the three
  things that now arrive unprompted.

**Bugs found and fixed on the way:**
- `useChatPanel` ran in **two** instances (`inbox-view.tsx` and `inbox-chat-panel.tsx`), each
  with its own `useEffect` — every conversation open fired `fetchConversationAction` and
  `fetchAISuggestionAction` twice, doubling AI calls. Lifted to `InboxView`, passed down.
- The conversation list was `useState(initialConversations)` with no setter — a snapshot
  frozen at mount. No reactivity was possible without this.
- Optimistic sends used fake `msg-${Date.now()}` ids, so the Realtime echo would have
  rendered a duplicate bubble (see T-021).
- `unread` never cleared; opening a conversation now marks it read.

**Deliberately deferred:** typewriter/streaming reveal on the suggestion. JSON mode + Zod
validation means the response arrives complete, so animating it character by character would
misrepresent latency and add perceived delay. Real streaming needs SSE from `ml/` and a
different validation strategy — an architecture decision, not a design task.

**Addressed by T-005 (2026-08-16), then narrowed by T-005's second replan:** the "regenerate"
button streams via `POST /api/ai/reply-suggestion` (`web-app/ai/`, `@ai-sdk/langchain`). It
originally showed the agent's tool-calling activity while waiting; once the tool-calling loop
was removed in favor of a single prefetch → finalize call, there was no more intermediate
activity left to show — the client now just sees the prefetch→finalize state transition, then
the finished result. The structured candidate itself still arrives whole either way, for the
JSON-mode reason above. The suggestion that first loads when a conversation opens is
unaffected — that path still goes
through the plain, non-streaming `fetchAISuggestionAction`.

---

### ☑ T-028 · Debounced, presence-gated suggestion generation — DONE (2026-08-15)
**New:** `core/queue/`, `src/app/api/jobs/drain-suggestions/`, `migrations/008`,
`scripts/drain-suggestions.sh`

T-027 generated a suggestion on *every* inbound message — a customer typing three separate
bubbles in ten seconds burned three LLM calls for a draft only the last one would ever inform.

**Delivered:**
- `core/queue/suggestion-queue.ts` — `enqueueSuggestionJob()`/`drainDueSuggestionJobs()`,
  wrapping two `security definer` Postgres functions (migration 008) built on `pgmq`. The
  webhook's `after()` now enqueues (12s delay) instead of generating directly;
  `enqueue_suggestion_job()` deletes any job already pending for that conversation before
  adding the new one — that delete-then-send *is* the debounce, collapsing a burst into one job.
- `pg_cron` drains the queue every 10s by calling `POST /api/jobs/drain-suggestions` (shared
  secret via `INTERNAL_JOBS_SECRET`, read from Vault by the cron job — never a literal value in
  the migration). `pg_cron` runs inside Supabase's own Postgres, so there's no worker process
  for this app to host.
- Presence gate, checked at *drain* time rather than enqueue time (checking on arrival would
  treat a seller opening the conversation in reaction to that message as absent): the open
  chat panel writes `conversations.last_viewed_at` every ~20s; the drain endpoint skips
  generating if that timestamp isn't fresh (<60s). A seller who wasn't watching still gets a
  suggestion the moment they open the conversation, via the existing cache-miss path.

**Known limitation, not a bug:** `pg_cron` cannot reach `localhost`. The schedule is created
and fires every 10s regardless, but no-ops until a real deploy URL and the Vault secrets exist
(a manual, uncommitted step — see migration 008's comments). Until then,
`scripts/drain-suggestions.sh` does by hand what the cron would do.

**Reusable for T-009:** the follow-up scheduler needs exactly this shape of infrastructure
("claims due follow-ups... without double-sending under concurrency"). The `pgmq`/`pg_cron`
pattern proven here is directly applicable — most likely as its own queue rather than sharing
this one.

---

### ☑ T-029 · Move `database/` to `supabase/`, adopt the Supabase CLI — DONE (2026-08-15)

`web-app/database/` → `web-app/supabase/` (migrations, `client.ts`, `browser-client.ts`,
`seed.ts` all moved together) — `supabase/` is the folder name the CLI itself expects
(`supabase/migrations/`, `supabase/config.toml`), which is what makes `supabase db push`
possible instead of pasting each migration into the SQL Editor by hand. Historical entries
above that reference `database/migrations/00N_*.sql` describe the path as it was *at the time*
— left as-is rather than rewritten.

The 8 existing migrations were renamed to the CLI's timestamp format (e.g.
`20260813000001_initial_schema.sql`) and reconciled into the CLI's tracking table via
`supabase migration repair --status applied <version>` for each — bookkeeping only, no SQL
re-executed. This was necessary, not just tidy: migration 003's `create policy` and 004's
`alter table ... add column` have no `if not exists`/`drop ... if exists` guard, so a naive
`db push` against the CLI's (empty) tracked history would have failed applying 003/004 against
a database that already has them.

`@db/*` still resolves via `tsconfig.json`/`vitest*.config.mts` — now to `supabase/*` — kept as
`@db`, not renamed to `@supabase`, to avoid colliding with the real `@supabase/supabase-js` /
`@supabase/ssr` npm packages.

**Going forward:** new migrations via `supabase migration new <name>`, applied with
`supabase db push` — the SQL Editor copy-paste workflow this project used through T-028 is
retired.

---

## Suggested sequence

**Now — unblock and secure** ☑
~~T-024, T-001, T-002, T-003~~ — done. T-025 (linting) remains on hold.

**Next — schema before it gets expensive** ☑
~~T-013, T-011, T-012~~ — all applied to the `Avoid Upsell` cloud project.

> The T-012 blocker resolved itself by forcing T-001: RLS needs `auth.uid()`, so the auth
> bypass had to go. Password auth sidesteps the email-delivery constraint that caused the
> deferral in the first place.

**Then — prove the value proposition** ☑ through T-006
~~T-004 → T-005 → T-006~~ → T-007 → T-015

This gives a demonstrable copilot without any Meta dependency: conversations arrive by
seed or import, the AI reads them and proposes real replies, the seller sends. It is the
shortest path to knowing whether the core idea holds up. T-005/T-006 are done against
`AI_MOCK_MODE=true` — end-to-end verification against a real `OPENAI_API_KEY` and a live
Supabase project is still outstanding, whichever of T-007/T-015 picks it up first.

**In parallel, starting now — Meta app review**
T-010a and T-010d have external approval lead times measured in weeks. Begin the paperwork
while building the AI layer.

**Then — automation**
T-014 → T-008 → T-009 → the rest of T-010

**Continuously**
T-018 onward.
