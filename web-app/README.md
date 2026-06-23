# VendAI Dashboard

Next.js 15 + Tailwind CSS + shadcn/ui + Recharts

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Initialize shadcn/ui (run once)
npx shadcn@latest init

# 3. Add required shadcn components
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add badge
npx shadcn@latest add tabs
npx shadcn@latest add switch
npx shadcn@latest add input
npx shadcn@latest add textarea
npx shadcn@latest add tooltip
npx shadcn@latest add dropdown-menu
npx shadcn@latest add dialog
npx shadcn@latest add select
npx shadcn@latest add avatar

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

```
src/
├── app/                        # Next.js App Router entry
├── lib/
│   ├── utils.ts                # cn() helper
│   └── mock-data.ts            # Mock data — replace with real API
├── types/index.ts              # All TypeScript types
├── components/
│   ├── ui/                     # shadcn/ui components (added via CLI above)
│   └── shared/                 # Shared custom components
│       ├── platform-badge.tsx
│       └── avatar.tsx
└── features/
    ├── inbox/                  # Inbox feature
    │   ├── inbox-page.tsx           # Orchestrator
    │   ├── inbox-sidebar.tsx / .hook.ts
    │   ├── inbox-conversation-list.tsx / .hook.ts / .service.ts
    │   ├── inbox-chat-panel.tsx / .hook.ts / .service.ts
    │   └── inbox-details-panel.tsx
    ├── analytics/              # Analytics feature
    │   ├── analytics-page.tsx
    │   ├── analytics-overview.hook.ts
    │   └── analytics-overview.service.ts
    └── settings/               # Settings feature
        ├── settings-page.tsx
        ├── settings-channels.hook.ts
        └── settings-channels.service.ts
```

## Architecture rules

| Layer | Rule |
|---|---|
| **Components** (`*.tsx`) | No business logic, no state management |
| **Hooks** (`*.hook.ts`) | State management only |
| **Services** (`*.service.ts`) | Business logic + API calls only |

## Replace mock data

Edit `src/lib/mock-data.ts` and swap the mock arrays for real API calls in the `*.service.ts` files.

## Connect real channels

Add your WhatsApp Business API, Meta Graph API credentials in environment variables:

```env
WHATSAPP_ACCESS_TOKEN=
INSTAGRAM_ACCESS_TOKEN=
FACEBOOK_PAGE_ACCESS_TOKEN=
```
