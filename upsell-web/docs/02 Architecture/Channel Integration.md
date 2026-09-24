---
type: architecture
title: Channel Integration
updated: 2026-09-15
related:
  - "[[02 Architecture/Overview]]"
  - "[[03 Contracts/Channel]]"
  - "[[04 Decisions/ADR-002 Provider-Neutral Inbox Integration]]"
---

# Channel Integration

## Goal

Support WhatsApp, Instagram, and Facebook through a provider-neutral inbox flow,
while allowing provider-specific adapters under the hood.

## Integration pattern

- `InboxService` is the single server-only orchestration entry point
- Providers live behind a common contract under `src/server/inbox/providers/`
- Hosted Auth state signs business, channel, and provider context
- Public webhooks delegate to inbox orchestration instead of implementing parallel
  logic paths

## Flow

1. A tenant starts channel connection from an authenticated UI flow
2. Hosted Auth or provider auth binds the external account to the business
3. Incoming provider events are verified, normalized, and persisted
4. Outbound replies are sent through the provider and reconciled with local state
5. Realtime updates keep the operator view fresh

## Provider-neutral guarantees

- One internal contract for channel connection and event persistence
- Provider event normalization before persistence
- Tenant resolution from trusted channel linkage, not from request payload
- Idempotent handling for repeated provider deliveries

## Current gap

The architectural shape exists, but the full real-provider loop is still incomplete.
The codebase already supports provider-neutral orchestration, webhook verification,
and connection state concepts. The missing work is full provider adaptation and
real outbound delivery confirmation.
