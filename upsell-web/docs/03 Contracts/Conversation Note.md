---
type: contract
title: Conversation Note
updated: 2026-09-15
related:
  - "[[02 Architecture/Inbox Domain]]"
  - "[[03 Contracts/Conversation]]"
---

# Conversation Note

## Meaning

A conversation note is a private internal note attached to a conversation for
operator context.

## Important fields

- `id`
- `conversation_id`
- `author_id`
- `content`
- `created_at`

## Validation notes

- Content is trimmed and must be between 1 and 4000 characters
- Notes are tenant-scoped in the database and linked to the author profile
- The create request requires a conversation identifier and non-empty content

## Why it matters

Notes are the clearest example of a UI feature that must remain strictly internal.
They are visible in the operator workflow but must never be sent to the customer or
leak across tenants.
