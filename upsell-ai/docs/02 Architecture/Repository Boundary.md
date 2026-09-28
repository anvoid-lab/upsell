---
type: architecture
title: Repository Boundary
updated: 2026-09-26
related:
  - "[[04 Decisions/ADR-008 The Repository Owns Persistence Rules]]"
  - "[[04 Decisions/ADR-005 One Tenant Context Per Request]]"
  - "[[02 Architecture/Persistence and Context]]"
  - "[[02 Architecture/CRUD Tool Factory]]"
  - "[[02 Architecture/Testing Strategy]]"
---

# Repository Boundary

There is one generic repository implementation. A feature instantiates it per
table, or extends it when it needs a domain query the base cannot express.

## What the base owns

These rules are identical for every table, so they live in one place:

- **Tenant scoping.** Every read and write filters the tenant column of the
  current tenant context. An access without a tenant context raises instead of
  querying.
- **Soft deletion.** When the table has a deletion marker, those rows are
  invisible to reads, and deletion marks the row.
- **Exact money.** Fields typed as an exact decimal are read and written as
  text, so a price never passes through a floating-point value.

## Interface

| Operation | Purpose |
| --- | --- |
| `get(tenant, id?)` | One row. Without `id` the tenant column is the match, which is how a tenant's own row is read. |
| `find(tenant, ids=..., equals=..., order=...)` | Rows in one tenant, optionally filtered. An empty `id` list returns nothing without querying. |
| `insert(tenant, row, upsert=...)` | Write one row. Replacing an existing row is opt-in. |
| `update(tenant, id, row)` | Write selected columns of one row. |
| `delete(tenant, id)` | Remove one row, marking it when the table supports soft deletion. |
| `delete_many(tenant, ids=..., equals=..., soft_delete=...)` | Remove every matching row and report how many. |

Construction options: the tenant column, the key column, and whether the table
soft deletes.

## Model rules

Two model bases exist, described in [[03 Contracts/Agent Context]]:

| Base | Used for | Unknown fields |
| --- | --- | --- |
| Contract | Shapes this application defines, such as the conversation request | rejected |
| Record | Rows read from persistence, such as a customer, a business, a product | ignored |

A record ignores unknown columns, so a later additive migration cannot break a
read.

## What stays in the service

The repository knows nothing about domain intent. Rules such as "products the
copilot may recommend must be active", cache orchestration, idempotency, and
policy stay in the service, which passes them in:

```python
products = await self.products_repo.find(tenant, equals={"active": True})
```

## Custom repositories

A feature adds one only for a query the base cannot express, and keeps it in its
own folder, per [[04 Decisions/ADR-007 A Feature Is One Folder]]. A custom
repository that only forwards to the base is removed.

## Testing

The pure helpers of the base, such as the select clause, the text-cast
normalization, and the write serialization, are unit tested. Tenant scoping,
soft deletion, and numeric precision are verified by the smoke suite against the
real database.
