---
type: decision
title: ADR-002 Provider-Neutral Inbox Integration
status: accepted
date: 2026-09-15
updated: 2026-09-15
related:
  - "[[02 Architecture/Channel Integration]]"
  - "[[03 Contracts/Channel]]"
  - "[[03 Contracts/Message]]"
---

# ADR-002 - Provider-Neutral Inbox Integration

## Context

The product targets multiple messaging channels, but each provider has different auth,
webhook, and delivery semantics. Duplicating separate end-to-end stacks per provider
would increase complexity and fragment tenant safety rules.

## Decision

Use a provider-neutral inbox integration design:

- `InboxService` remains the sole server-side orchestration entry point
- Providers implement adapter behavior behind shared contracts
- Public webhooks delegate into inbox orchestration
- The selected channel and trusted provider linkage drive tenant resolution

## Positive consequences

- Shared cross-channel behavior lives in one place
- New providers can be added as adapters instead of full parallel stacks
- Idempotency and tenant isolation rules stay centralized

## Negative consequences

- Provider-specific nuances still need careful adapter design
- The shared contract may lag behind the most expressive provider features

## Alternatives considered

- Separate service stacks for WhatsApp, Instagram, and Facebook
- Provider-specific webhook modules with duplicated orchestration behavior
