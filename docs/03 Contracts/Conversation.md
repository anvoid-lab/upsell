---
type: contract
title: Conversation
updated: 2026-09-15
related:
  - "[[02 Architecture/Inbox Domain]]"
  - "[[03 Contracts/Message]]"
  - "[[03 Contracts/Conversation Note]]"
  - "[[03 Contracts/Follow Up]]"
---

# Conversation

## Meaning

A conversation is the operator-facing thread for a customer interaction.

## Statuses

- `open`
- `pending`
- `resolved`

## Shapes

- `ConversationDoc` is the raw persisted shape without joined messages
- `Conversation` extends the doc with `messages[]` and `notes[]`
- `ConversationRealtimeRow` models what Realtime events actually deliver

## Important fields

- `id`
- `contact`
- `last_message`
- `last_message_at`
- `status`
- `unread`
- `product_interest`
- `channel_conversation_id`
- `follow_ups`

## Validation notes

- Database bigint identifiers are coerced to strings for application use
- Real-time payload validation omits joined-only fields such as `follow_ups`
- Status updates require both `conversation_id` and a valid status enum value

## Why it matters

Conversation is the aggregate boundary that the inbox UI presents, but the database
stores parts of that aggregate in separate normalized tables.
