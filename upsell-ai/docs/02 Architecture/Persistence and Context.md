---
type: architecture
title: Persistence and Context
updated: 2026-09-28
---

# Persistence and Context

Phase 01 does not load or persist customer, business, product, price, stock, or
media data. `TenantContext.customer_id` is a read-only opaque identifier for a
future external data integration.

Existing database migrations, row contracts, and `BaseRepository` remain in the
repository unchanged. They are reserved for the phase that needs persistent
business operations; they are not dependencies of the chat turn.

`AgentContext` is in-memory mutable state for one agent run. It is passed to
the Agents SDK as local run context. Code updates only the affected fields with
normal assignment and built-in list/dict mutation.
