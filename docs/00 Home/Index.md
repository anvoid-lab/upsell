---
type: home
title: Vault Index
updated: 2026-09-24
related:
  - "[[00 Home/How to use]]"
  - "[[02 Architecture/Overview]]"
  - "[[01 Backlog/Phase 01 - Real Channel MVP]]"
---

# Vault Index

## Purpose

This vault documents the current implemented product, the active backlog, and the
major decisions that shape the `anvoid-upsell` repository.

## Quick links

- [[00 Home/How to use]]
- [[01 Backlog/Phase 01 - Real Channel MVP]]
- [[01 Backlog/Phase 02 - Inbox Persistence and Recovery]]
- [[01 Backlog/Phase 03 - Sales Copilot Definition]]
- [[01 Backlog/Phase 04 - Launch Readiness]]
- [[02 Architecture/Overview]]
- [[02 Architecture/Inbox Domain]]
- [[02 Architecture/Channel Integration]]
- [[02 Architecture/Data and Multi-tenancy]]
- [[03 Contracts/Conversation]]
- [[03 Contracts/Message]]
- [[04 Decisions/ADR-001 Active Scope Excludes AI Execution]]

## Repository map

- `ideas/`: historical product and strategy notes, including AI-oriented future ideas
- `web-app/`: implemented application, tests, and Supabase schema
- `docs/`: this Obsidian vault

## Current product summary

The implemented system is a multi-tenant unified inbox for WhatsApp and Instagram,
with Supabase Auth, RLS isolation, real-time inbox updates, and a Unipile-backed,
provider-neutral integration layer centered on `InboxService`. Facebook remains in
the broader channel contract and product direction, but is not enabled by the current
inbox adapter.

AI generation, RAG, embeddings, queue-based automation, and autonomous sales flows
are not part of the current live implementation. Future follow-up execution is being
reframed under a Sales Copilot architecture.

## Suggested reading path

1. [[00 Home/How to use]]
2. [[02 Architecture/Overview]]
3. [[03 Contracts/Channel]]
4. [[03 Contracts/Conversation]]
5. [[01 Backlog/Phase 01 - Real Channel MVP]]
6. [[04 Decisions/ADR-002 Provider-Neutral Inbox Integration]]
