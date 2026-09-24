---
type: phase
phase: 1
title: Real Channel MVP
status: completed
priority: high
depends_on: []
updated: 2026-09-24
related:
  - "[[02 Architecture/Channel Integration]]"
  - "[[03 Contracts/Channel]]"
  - "[[03 Contracts/Message]]"
---

# Phase 01 - Real Channel MVP

## Objective

Deliver the first real end-to-end channel flow: connect an account, receive a real
customer message, reply from the inbox, and keep tenant isolation intact.

## Deliverables

- [x] Real provider authentication for the first production channel
- [x] Incoming provider events adapted to the internal inbox contract
- [x] Outbound replies delivered through the provider
- [x] Provider-aware idempotency and reconnection handling

## Backlog

- [x] Finalize first-channel implementation: Unipile with WhatsApp and Instagram
- [x] Implement account connection and protected credential lifecycle
- [x] Resolve tenant/business from the connected provider account
- [x] Persist provider message identifiers and delivery status updates
- [x] Confirm duplicate webhook handling across repeated deliveries

## Acceptance criteria

- [x] A real account can be connected by a tenant user
- [x] A real inbound message appears in the correct company inbox
- [x] A reply sent from the app reaches the customer
- [x] Repeated webhook deliveries do not create duplicates
- [x] Cross-company data leakage is impossible in the tested flow

## Blockers

None for the implemented flow. Provider-specific sending policies remain an operational
requirement for future automated follow-ups.

## Execution notes

This phase completes backlog item `T-010` for the implemented Unipile adapter. Hosted
Auth creates and reconnects WhatsApp or Instagram accounts, authenticated webhooks
normalize inbound and delivery events, and outbound replies are stored with provider
identifiers and delivery state. Webhook, provider, and tenant-isolation coverage passed
on 2026-09-24 together with lint and a production build.
