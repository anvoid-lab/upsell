# VendAI — Engineering Backlog

> **Status snapshot (2026-08-14):** the app is a high-fidelity prototype wired to a real
> Supabase database. All three screens (Inbox, Analytics, Settings) read live data through a
> clean layer stack (Zod contracts → `BaseRepository` → `server-only` services → client views).
> `npm run build` and `tsc --noEmit` both pass.
>
> What does **not** exist yet is the product itself: there is no LLM, no messaging channel,
> and no scheduler. Everything the user perceives as "AI" is static seed data.

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

---

## P0 — Security and correctness blockers

### T-001 · Fix the magic-link authentication bypass
**File:** `web-app/src/app/(auth)/login/actions.ts:14`

`requestMagicLinkAction` never calls Supabase. It accepts any email string, calls
`createSession(email)`, and redirects straight to `/inbox`. Anyone can sign in as anyone by
typing an email address. The OTP path (`verifyOtpAction`) is implemented correctly — the
magic-link path was left as a stub.

**Done when:** the action calls `supabase.auth.signInWithOtp({ email })`, redirects to
`/login/check-email`, and a session is only created after the callback or OTP verifies the
identity. No code path creates a session from unverified input.

---

### T-002 · Move `SESSION_SECRET` into the environment
**File:** `web-app/src/lib/session.ts:6`

The JWT signing key falls back to the literal
`"vendai-dev-secret-change-in-production"` because `SESSION_SECRET` is absent from
`.env.local`. Any deploy inheriting this fallback lets an attacker forge session cookies.

**Done when:** `SESSION_SECRET` is set locally and in every deploy target, and the module
throws at startup if the variable is missing instead of falling back.

---

### T-003 · Remove stale MongoDB configuration
**Files:** `web-app/.env.local`, `docker-compose.yml`

`MONGODB_URI` and `MONGODB_DB` are still in `.env.local`, and the root `docker-compose.yml`
still defines a MongoDB container. Both are dead since the Supabase migration and mislead
anyone setting up the project.

**Done when:** the Mongo variables are gone from `.env.local` (and from any `.env.example`),
and the compose file is either deleted or reduced to services still in use.

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

### T-011 · Multi-tenancy
**File:** `web-app/database/migrations/001_initial_schema.sql`

No table carries a `business_id` or `user_id`. Every signed-in user sees the same
conversations, contacts, and settings. The app currently cannot serve two customers.

**Done when:** every domain table is scoped to a business, `BaseRepository` enforces the
scope, and a user can only ever read or write rows belonging to their own business.

---

### T-012 · Enable Row Level Security
**Depends on:** T-011

The migration explicitly runs `disable row level security` on all seven tables. Combined with
a publishable key that reaches the browser, this means the database is protected only by the
fact that nobody has tried yet.

**Done when:** RLS is enabled on every table with policies keyed to the authenticated user's
business, and a test proves cross-tenant reads are rejected at the database level.

---

### T-013 · Migrate text timestamps to `timestamptz`

`last_message_at`, `messages.timestamp`, `follow_ups.scheduled_for`, `follow_ups.sent_at`,
and `channels.connected_at` are all `text` columns holding display-formatted strings
(`"14:32"`, `"20 Jun 2026"`). They cannot be sorted or range-queried.

This blocks the scheduler (T-009), silence detection (T-008), and real analytics (T-016).
Formatting belongs in the view layer, not the database.

**Done when:** the columns are `timestamptz`, existing rows are migrated, contracts and the
seed are updated, and all display formatting happens client-side.

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

### T-016 · Real analytics
**File:** `web-app/src/app/(app)/analytics/analytics-overview.service.ts:63`

Two problems:
- `chart_data` fabricates the 7-day series arithmetically from current totals, because no
  historical timestamps exist. The chart is fiction.
- Every KPI delta is hard-coded to `"+0"` with `delta_positive: true`.

**Done when (depends on T-013):** the chart aggregates over real timestamps and deltas are
computed against the prior period.

---

### T-017 · Conversion attribution

The product's entire promise is "we recover sales you would have lost." Nothing currently
measures that. Track which AI-assisted replies and follow-ups led to a conversion, so the
business can see revenue attributable to VendAI.

**Done when:** the seller can mark a conversation as won, and analytics show conversions
attributable to AI-assisted messages versus unassisted ones.

---

## P3 — Quality and hardening

### T-018 · Test suite
No test runner is configured. Priority order: contract schemas, `BaseRepository` (especially
soft-delete filtering), the services, then the scheduler's concurrency behaviour.

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

### T-024 · Commit the in-progress Inbox refactor
~836 uncommitted lines across `inbox-chat-panel.tsx`, `inbox-conversation-list.tsx`,
`inbox-details-panel.tsx`, and `inbox-view.tsx`, plus a `CLAUDE.md` rewrite. Land this before
starting new work to avoid conflicts.

---

## Suggested sequence

**Now — unblock and secure**
T-024 (land the refactor) → T-001, T-002, T-003

**Next — schema before it gets expensive**
T-013, T-011, T-012 — these get harder with every table and row added

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
