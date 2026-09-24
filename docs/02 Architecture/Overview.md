---
type: architecture
title: Overview
updated: 2026-09-15
related:
  - "[[02 Architecture/Inbox Domain]]"
  - "[[02 Architecture/Channel Integration]]"
  - "[[02 Architecture/Data and Multi-tenancy]]"
  - "[[02 Architecture/Frontend and Operations]]"
---

# Overview

## System summary

`anvoid-upsell` is organized around a single implemented application in `web-app/`:

- Next.js 16 App Router SSR frontend
- Supabase Auth and PostgreSQL persistence
- Multi-tenant data isolation through RLS
- Provider-neutral channel integration centered on an inbox domain
- Realtime updates for conversations and messages

## Repository shape

- `ideas/` contains historical strategy and commercial notes
- `web-app/` contains the implemented application, schema, and tests
- `docs/` contains this Obsidian vault

## Layer model

- `core/contracts/` defines Zod schemas and shared domain types
- `core/repository/` holds generic Supabase CRUD and soft-delete behavior
- `src/app/` contains routes, server actions, and client views
- `src/server/` contains server-only services and provider integrations
- `supabase/` contains clients, migrations, and seed logic
- `tests/` covers unit and integration behavior

## Architectural boundaries

- Server pages call server-only services and pass typed props to client views
- Browser-side Supabase usage is limited to Realtime concerns
- `InboxService` is the only server-only orchestration entry point for channel
  connection, synchronization, and incoming event handling
- The service-role Supabase client is restricted to flows that cannot rely on a
  user session, especially webhook processing

## Current scope

The implemented scope is a real-time, multi-tenant inbox foundation. Active AI
behavior has been removed. Existing AI-facing UI remnants are intentionally inert
until a future Sales Copilot design is formally defined.
