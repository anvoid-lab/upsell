---
type: architecture
title: Data and Multi-tenancy
updated: 2026-09-15
related:
  - "[[02 Architecture/Overview]]"
  - "[[03 Contracts/Conversation]]"
  - "[[03 Contracts/Message]]"
  - "[[04 Decisions/ADR-003 Supabase Session and RLS Isolation]]"
---

# Data and Multi-tenancy

## Core tables

- `businesses`
- `profiles`
- `channels`
- `conversations`
- `messages`
- `follow_ups`
- `conversation_notes`

## Tenant model

Every domain table carries `business_id`. Row-level security policies constrain each
authenticated user to data belonging to the current business resolved from their
Supabase session.

## Important implementation details

- `current_business_id()` is a `SECURITY DEFINER` helper used by RLS policies
- Most inserts rely on `business_id` defaults instead of the caller setting it
- Webhook and other service-role flows must still resolve and filter `business_id`
  explicitly because they do not run under a user session
- `conversations`, `messages`, `follow_ups`, and `conversation_notes` use generated
  identity or default-backed IDs and timestamps

## Data behavior

- Conversations store a normalized summary plus joined messages at the service layer
- Messages keep both internal IDs and external channel message IDs
- Follow-ups remain part of the schema even though end-to-end execution is paused
- Conversation notes are private tenant-scoped records linked to the operator author

## Operational implications

- Seed flows require the service key because anonymous access has no policies
- Session truth must remain in Supabase Auth to keep RLS behavior correct
- Service-role code is the main multi-tenant risk and must never trust request payload
  tenancy hints
