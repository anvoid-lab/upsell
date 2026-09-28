---
type: decision
title: "ADR-008: The Repository Owns Persistence Rules"
status: accepted
updated: 2026-09-26
related:
  - "[[02 Architecture/Repository Boundary]]"
  - "[[02 Architecture/Persistence and Context]]"
  - "[[04 Decisions/ADR-005 One Tenant Context Per Request]]"
---

# ADR-008: The Repository Owns Persistence Rules

## Decision

One generic repository implements the persistence rules every table shares:
tenant scoping, soft deletion, exact money, and the create, read, update, and
delete operations. A feature extends it only for a query the base cannot
express, and keeps that extension inside its own folder.

Domain intent stays in the service. The repository does not know what a
"recommended product" or an "active conversation" means.

## Rationale

Scoping, soft deletion, and numeric fidelity are correctness rules, not
conveniences. Implemented once, they cannot be forgotten by the next feature.
Implemented per feature, one omission silently reads across tenants or rounds
money.

Keeping intent in the service preserves the separation that makes rules
reviewable: the repository guarantees safe access, the service decides what is
allowed.

## Rules

- Every read and write is scoped by the tenant context. An access without one is
  refused rather than attempted.
- Soft-deleted rows are invisible to every read of a table that supports soft
  deletion, and deletion marks such a row instead of removing it.
- Money is read and written as an exact decimal representation, never through a
  floating-point value.
- A write is explicit about its behavior: replacing an existing row is an
  opt-in, never a side effect of creating one.
- A custom repository holds only domain queries, and only the ones the base
  cannot express.
- A row read from persistence ignores unknown columns, so an additive change
  cannot break a read.
