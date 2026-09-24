---
type: architecture
title: Frontend and Operations
updated: 2026-09-15
related:
  - "[[02 Architecture/Overview]]"
  - "[[01 Backlog/Phase 02 - Inbox Persistence and Recovery]]"
  - "[[01 Backlog/Phase 04 - Launch Readiness]]"
---

# Frontend and Operations

## Frontend shape

- Next.js App Router is the application shell
- `src/app/` organizes authenticated routes for inbox, analytics, and settings
- Shared UI components live under `src/components/`
- Server pages pass typed data into client views instead of exposing repositories to
  the browser

## Client responsibilities

- Render typed props
- Maintain local interaction state
- Subscribe to Realtime where necessary
- Reflect server-confirmed state for sending, persistence, and channel status

## Operational posture

- Unit tests validate domain and service behavior without live network calls
- Integration tests validate RLS and database behavior against the real Supabase project
- Production safety still needs stronger lint alignment, smoke tests, and monitoring
- Mobile UX, onboarding clarity, and recovery states remain backlog work

## Current concern areas

- Several analytics views still contain simulated or partial data
- Some inbox controls remain local-state-only and need durable persistence
- The project is close to an operator workflow foundation, but not yet at full
  production readiness
