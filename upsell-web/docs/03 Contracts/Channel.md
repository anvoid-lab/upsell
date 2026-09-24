---
type: contract
title: Channel
updated: 2026-09-15
related:
  - "[[02 Architecture/Channel Integration]]"
  - "[[03 Contracts/Conversation]]"
---

# Channel

## Meaning

A channel represents a business-owned connection to an external messaging platform.

## Platforms

- `whatsapp`
- `instagram`
- `facebook`

## Important fields

- `platform`
- `connected`
- `account_name`
- `connected_at`
- `provider`
- `connection_status`

## Validation notes

- Connection status is constrained to `disconnected`, `connecting`, `syncing`,
  `connected`, `reconnect_required`, or `error`
- The current contract models connection state, not provider credentials
- The connection response returns a single `channel` object

## Why it matters

The rest of the inbox depends on channel linkage to resolve tenancy safely, map
provider events, and decide where outbound messages should be sent.
