---
type: phase
phase: 2
title: Inbox Persistence and Recovery
status: active
priority: high
depends_on:
  - "[[01 Backlog/Phase 01 - Real Channel MVP]]"
updated: 2026-09-24
related:
  - "[[02 Architecture/Inbox Domain]]"
  - "[[03 Contracts/Conversation]]"
  - "[[03 Contracts/Conversation Note]]"
---

# Phase 02 - Inbox Persistence and Recovery

## Objective

Make the inbox trustworthy after refreshes, retries, and transient failures.

## Deliverables

- [x] Persistent conversation state updates
- [x] Persistent internal notes per conversation
- [x] Visible send states and retry path for outbound messages
- [x] Distinct empty, loading, disconnected, and error states
- [ ] Company-managed quick replies and channel-compatible attachments
- [ ] Correct message dates, conversation navigation, and per-conversation drafts

## Backlog

- [x] Persist conversation status changes on the server
- [x] Persist private notes with author and timestamp
- [x] Roll back failed optimistic UI state changes
- [x] Preserve drafts and failed send content
- [x] Add retry without duplicating the local message row
- [x] Distinguish onboarding, no-data, disconnected, and error UI states
- [ ] Replace fixed templates with company-managed quick replies
- [x] Define, validate, store, and send the first supported attachment types per channel
- [ ] Keep internal templates distinct from provider-approved message templates
- [ ] Group messages by their actual timestamps instead of their list position
- [ ] Generate conversation links from the application route and preserve drafts when switching conversations

## Acceptance criteria

- [x] Refreshing the page preserves conversation state and notes
- [x] Notes remain private and never go to the external channel
- [x] A failed send is visible and recoverable
- [x] Retry does not create a second local message
- [x] New tenants understand the next action from the empty state
- [ ] Quick replies and attachments respect company and channel constraints
- [ ] Message date groups, deep links, and drafts remain correct after navigation

## Blockers

None beyond Phase 01 dependencies.

## Execution notes

This phase groups active backlog items `T-019`, `T-021`, `T-022`, `T-030`, `T-031`,
and `T-033`. Attachment support starts only after Phase 01 establishes the actual
capabilities and policy constraints of the first channel.
Implemented so far: persisted state and notes, optimistic sending with retry and
delivery states, attachment sending, and inbox onboarding/error states. It remains
active because quick replies, provider-template separation, real date grouping,
route-derived links, and drafts that survive conversation changes are still pending.
