# VendAI — Engineering Backlog

> **Status snapshot (2026-08-14):** the app is a high-fidelity prototype wired to a real
> Supabase database. All three screens (Inbox, Analytics, Settings) read live data through a
> clean layer stack (Zod contracts → `BaseRepository` → `server-only` services → client views).
> `npm run build` and `tsc --noEmit` both pass.
>
> What does **not** exist yet is the product itself: there is no LLM, no messaging channel,
> and no scheduler. Everything the user perceives as "AI" is static seed data.
>
> **Progress:** T-024, T-001, T-003, T-011, T-012, T-013 done (T-002 superseded by T-001);
> T-016 partly done; T-025 on hold. Every P0 is now closed.
> Next up: **T-004 → T-005** — the AI layer, i.e. the product itself.

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

## P1 — The core product

### T-004 · Add an LLM provider layer
**New:** `web-app/core/ai/`

No LLM is integrated anywhere in the codebase. Build a thin, provider-agnostic layer before
any feature depends on it: client construction, model selection, retry and timeout handling,
token accounting, and structured (schema-validated) output so generated drafts can be parsed
reliably rather than scraped from prose.

**Done when:** a `server-only` module exposes a typed `generate()` that returns
contract-validated output, with the API key read from the environment and never reaching the
client bundle.

---

### T-005 · Build the reply-suggestion engine
**Depends on:** T-004

Given a conversation, produce a reply the seller can send. This is the heart of the product.

The generator receives:
- full message history for the conversation
- the contact's profile and status (`interested`, `negotiating`, …)
- the detected product interest
- the business's configured tone, language, and enabled sales techniques

and returns one or more candidate replies, each labelled with the technique it applies and a
short rationale so the seller understands *why* it was proposed.

**Done when:** opening a conversation in the Inbox produces a genuinely generated draft that
reflects that specific conversation, and switching conversations produces a different one.

---

### T-006 · Replace the static AI suggestion with live generation
**Files:** `web-app/src/app/(app)/inbox/inbox-chat-panel.service.ts:38`, `database/seed.ts`
**Depends on:** T-005

`fetchAISuggestion()` reads a fixed row from `ai_suggestions` that the seed script inserted.
The panel is presentation-complete but shows canned text.

**Done when:** the panel calls the suggestion engine, shows a loading state while generating,
lets the seller edit the draft before sending, and handles generation failure without
breaking the conversation view. The `ai_suggestions` table becomes a cache/audit log of what
was generated, not the source of truth.

---

### T-007 · Conversation analysis — intent, objection, and buying stage
**Depends on:** T-004

For the copilot to suggest the *right* reply it must first understand where the sale stands.
Classify each conversation into a buying stage (browsing → asking → objecting → ready →
lost), extract the product of interest, and detect the specific objection blocking the sale
(price, trust, timing, availability).

This classification drives which sales technique T-005 applies, and it is what makes the
suggestion feel targeted instead of generic.

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
- **T-010b** — Webhook endpoint receiving inbound messages, with signature verification, idempotent delivery handling, and normalisation into the `messages`/`conversations` schema
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

### T-021 · Optimistic UI for message sending
`sendMessage()` round-trips to the server before the message appears. On a mobile connection
in Angola this will feel broken. Render optimistically and reconcile.

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

## Suggested sequence

**Now — unblock and secure** ☑
~~T-024, T-001, T-002, T-003~~ — done. T-025 (linting) remains on hold.

**Next — schema before it gets expensive** ☑
~~T-013, T-011, T-012~~ — all applied to the `Avoid Upsell` cloud project.

> The T-012 blocker resolved itself by forcing T-001: RLS needs `auth.uid()`, so the auth
> bypass had to go. Password auth sidesteps the email-delivery constraint that caused the
> deferral in the first place.

**Then — prove the value proposition**
T-004 → T-005 → T-006 → T-007 → T-015

This gives a demonstrable copilot without any Meta dependency: conversations arrive by
seed or import, the AI reads them and proposes real replies, the seller sends. It is the
shortest path to knowing whether the core idea holds up.

**In parallel, starting now — Meta app review**
T-010a and T-010d have external approval lead times measured in weeks. Begin the paperwork
while building the AI layer.

**Then — automation**
T-014 → T-008 → T-009 → the rest of T-010

**Continuously**
T-018 onward.
