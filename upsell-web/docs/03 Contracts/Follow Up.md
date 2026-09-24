---
type: contract
title: Follow Up
updated: 2026-09-15
related:
  - "[[02 Architecture/Inbox Domain]]"
  - "[[01 Backlog/Phase 03 - Sales Copilot Definition]]"
---

# Follow Up

## Meaning

A follow-up captures a scheduled recovery action tied to a conversation. The data
model exists today even though the fully operational feature is intentionally paused.

## Statuses

- `scheduled`
- `sent`
- `cancelled`
- `failed`

## Types

- `urgency`
- `upsell`
- `social_proof`
- `cart_recovery`

## Important fields

- `conversation_id`
- `contact_name`
- `title`
- `message`
- `status`
- `type`
- `scheduled_for`
- `sent_at`

## Validation notes

- The current schedule request expects a conversation, a message, a positive delay,
  and a follow-up type
- The contract still reflects a more manual scheduling shape than the newer Sales
  Copilot direction described in the backlog

## Why it matters

This contract shows where the implemented schema and the updated product direction
currently diverge. It should evolve only after the Sales Copilot action contract is
defined.
