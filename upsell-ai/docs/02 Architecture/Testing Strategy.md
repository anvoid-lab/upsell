---
type: architecture
title: Testing Strategy
updated: 2026-09-28
---

# Testing Strategy

Unit tests use a deterministic agent dependency and in-memory cache to verify
request scope, `AgentContext` mutation, media translation, idempotency replay
and conflict behavior, and health. They do not require a model provider,
database, or Redis process.

The smoke suite is reserved for a configured compatible model provider and live
Redis. It must prove that a real `Runner.run()` path accepts text, image URLs,
and file URLs without storing the media, and that a completed request replays.
