---
type: architecture
title: Inbox Domain
updated: 2026-09-15
related:
  - "[[02 Architecture/Overview]]"
  - "[[03 Contracts/Conversation]]"
  - "[[03 Contracts/Message]]"
  - "[[03 Contracts/Conversation Note]]"
  - "[[03 Contracts/Follow Up]]"
---

# Inbox Domain

## Purpose

The inbox is the core product surface. It centralizes customer conversations across
channels and provides the operator workflow for reading, replying, tracking status,
and managing private context.

## Main concepts

- A `Channel` represents a provider-backed connection for a business
- A `Conversation` represents the stateful customer thread
- A `Message` represents inbound or outbound communication within a conversation
- A `Conversation Note` stores private operator-only context
- A `Follow Up` preserves scheduled recovery intent, even though full execution is
  currently paused pending Sales Copilot design

## Read path

- Route pages fetch data through server-only services
- Services assemble joined domain entities from normalized database tables
- Client views render typed props and subscribe to Realtime updates where needed

## Write path

- Authenticated user actions validate input through contracts
- Services write data through repositories or focused Supabase queries
- Outbound provider effects belong to server-side integration services, not to client
  components

## Key constraints

- Notes are private and never leave the application through an external channel
- Conversation status must persist at the server boundary, not only in local state
- Message sending needs idempotency, delivery status tracking, and retry behavior
- Follow-ups remain a preserved data concept, but not a completed operator feature
