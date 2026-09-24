---
type: decision
title: ADR-003 Supabase Session and RLS Isolation
status: accepted
date: 2026-09-15
updated: 2026-09-15
related:
  - "[[02 Architecture/Data and Multi-tenancy]]"
  - "[[03 Contracts/Conversation]]"
---

# ADR-003 - Supabase Session and RLS Isolation

## Context

The system is multi-tenant and stores all business data in shared tables. Any session
or policy mismatch could leak data across companies or make the app appear empty for
valid users.

## Decision

Use Supabase Auth as the only source of session truth and enforce tenant isolation
through row-level security using `current_business_id()`.

## Positive consequences

- Tenant isolation is enforced at the database boundary
- Auth and data visibility remain aligned
- Most application queries can rely on user-scoped defaults and policies

## Negative consequences

- Service-role code becomes a high-risk path that requires explicit business scoping
- Debugging policy issues can be more complex than plain application-layer filters

## Alternatives considered

- Custom application session independent from Supabase Auth
- Tenant isolation enforced only in application services without RLS
