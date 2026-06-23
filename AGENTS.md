# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product Context

VendAI is a unified inbox and AI sales assistant for small businesses selling via WhatsApp, Instagram, and Facebook. The core loop: customer messages → AI detects silence → AI sends a personalised follow-up → business closes the sale. The target market is lusophone Africa (Angola first). The web app (`web-app/`) is currently a high-fidelity prototype with all data mocked — there is no live backend.

## Commands

All commands run from `web-app/`:

```bash
npm run dev      # start dev server (Next.js with Turbopack)
npm run build    # production build — must pass before committing
npm run lint     # ESLint via next lint
```

No test runner is configured yet.

## Architecture

### Repo Layout

```
web-app/         # Next.js 15 frontend — the only active codebase
docs/            # Product spec and reference docs
api/             # Placeholder for future backend
obsidian-vault/  # Project knowledge base (not code)
```

### Web App (`web-app/src/`)

**Page-level feature slices** — each route under `src/app/` owns its own hook and service files co-located with the page:

```
src/app/<feature>/
  page.tsx              # Route entry point; composes sub-components
  <widget>.hook.ts      # All useState/useEffect; calls the service layer
  <widget>.service.ts   # Async data access (currently mock delays + mock-data.ts)
  <widget>.tsx          # Presentational component
```

Current routes: `/inbox`, `/analytics`, `/settings`. The `AppSidebar` (`src/app/sidebar.tsx`) drives navigation across all routes.

**Component layers:**

- `src/components/ui/` — shadcn/ui primitives (Radix-based, auto-generated via the shadcn CLI — don't hand-edit these)
- `src/components/shared/` — custom shared components (`Avatar`, `PlatformBadge`, `ConfirmToast`, `SegmentedControl`, etc.)

**Data and types:**

- `src/lib/mock-data.ts` — all fixture data; services import from here with artificial `setTimeout` delays to simulate latency
- `src/types/index.ts` — single source of truth for all domain types (`Conversation`, `Message`, `FollowUp`, `Contact`, `Platform`, `AISettings`, etc.)

**Key design decisions:**

- Services are singleton class instances (`inboxChatPanelService`, etc.). When the real API is built, only the service files change — hooks and components are unaffected.
- `ConfirmToastProvider` wraps the root layout (`src/app/layout.tsx`) for non-blocking confirmation flows across all pages.
- shadcn/ui is configured with `zinc` base colour and CSS variables (`components.json`).
- Font: Plus Jakarta Sans, loaded from Google Fonts in `layout.tsx`.

### Core (`web-app/core/`)

Server-side infrastructure. **Never imported from client components.**

**`core/repository.ts` — MongoDB base repository**

A generic `BaseRepository<T>` class that abstracts all MongoDB collection operations. It is collection-agnostic: each domain repository extends it and passes the collection name in the constructor.

Key design decisions:

- Uses the native MongoDB Node.js driver (`mongodb` package) — no ODM (no Mongoose).
- The Next.js app uses it **directly in Server Components and Server Actions** — there is no separate REST API layer between Next.js and the database.
- Supports soft-delete by convention: documents with `deletedAt: Date` are treated as deleted and excluded from standard queries.
- Keys are stored in MongoDB as `camelCase` (no snake_case conversion needed for Mongo).
- `_id` is always mapped to `id` (string) in the returned domain object.

The `Db` client is never instantiated inside `core/` — it is always injected by the caller:

```ts
// web-app/src/lib/mongodb-client.ts  ← instantiates and caches the Db singleton
const db = await getMongoDb();

// domain repository extends BaseRepository and receives db in the constructor
class ConversationRepository extends BaseRepository<Conversation> {
  constructor(db: Db) {
    super('conversations', db);
  }
}
```

Interface:

```ts
class BaseRepository<T> {
  constructor(collectionName: string, client: Db) {}

  findById(id: string): Promise<(T & { id: string }) | null>;
  findAll(options?: QueryOptions<T>): Promise<(T & { id: string })[]>;
  create(data: Partial<T>): Promise<(T & { id: string }) | null>;
  update(id: string, data: Partial<T>): Promise<(T & { id: string }) | null>;
  delete(ids: string | string[]): Promise<void>; // soft-delete (sets deletedAt)
  hardDelete(ids: string | string[]): Promise<void>; // permanent removal
  count(filters?: Partial<T>): Promise<number>;
  paginate(
    options?: QueryOptions<T>,
  ): Promise<PaginateResult<T & { id: string }>>;
}
```

Domain repositories extend `BaseRepository` and live alongside their domain types — they do **not** live inside `core/`.

**`web-app/src/lib/mongodb-client.ts`** — singleton `getMongoDb()` that reads `MONGODB_URI` and `MONGODB_DB` from env and returns a cached `Db` instance. Only imported server-side (Server Components, Server Actions).

## Guardrails

- `npm run build` must pass before committing.
- Never commit directly to `main` without explicit approval.
