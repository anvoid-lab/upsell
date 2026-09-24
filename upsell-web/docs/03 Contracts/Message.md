---
type: contract
title: Message
updated: 2026-09-15
related:
  - "[[02 Architecture/Inbox Domain]]"
  - "[[03 Contracts/Conversation]]"
---

# Message

## Meaning

A message is a single inbound or outbound communication unit within a conversation.

## Directions

- `in`
- `out`

## Delivery statuses

- `pending`
- `sending`
- `sent`
- `delivered`
- `read`
- `failed`

## Important fields

- `id`
- `conversation_id`
- `content`
- `attachment`
- `direction`
- `timestamp`
- `channel_message_id`
- `client_message_id`
- `delivery_status`
- `delivery_error`
- `provider_metadata`

## Validation notes

- Bigint identifiers are coerced to strings
- A send request must contain text or at least one attachment
- Attachments, quoted messages, reactions, edits, and provider metadata already have
  contract space even though not all channel paths are implemented end to end
- `client_message_id` supports local send reconciliation and idempotency

## Why it matters

Message is the most operationally sensitive contract because it touches Realtime,
provider idempotency, optimistic UI, retries, and eventual delivery confirmation.
