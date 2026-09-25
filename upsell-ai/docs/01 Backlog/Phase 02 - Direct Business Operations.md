---
type: phase
phase: 2
title: Direct Business Operations
status: planned
priority: high
depends_on:
  - "[[01 Backlog/Phase 01 - Foundation and E2E Harness]]"
updated: 2026-09-25
related:
  - "[[02 Architecture/Agent Boundaries]]"
  - "[[02 Architecture/CRUD Tool Factory]]"
  - "[[03 Contracts/Agent Context]]"
  - "[[03 Contracts/API]]"
---

# Phase 02 - Direct Business Operations

## Objective

Allow the Main Agent to complete low-risk operational requests directly through
validated common tools, without invoking the Sales Agent or Sales RAG.

## Owned E2E journey

User asks to list, create, or update a product, customer, or business -> Main Agent selects the
matching common tool -> application validates tenant and business rules -> data
is changed or queried -> structured result is returned and persisted.

## Deliverables

- [ ] Product, customer, and business CRUD/query tools via `crud_tool.py` factory
- [ ] Input/output schemas following the [[02 Architecture/CRUD Tool Factory]] naming convention
- [ ] Preserve decimal prices, integer stock, nullable JSONB, and business defaults
- [ ] Rule enforcement for trusted business data
- [ ] Routing tests proving Sales Agent is not called

## Backlog

- [ ] Implement `product_tools.py` with `CreateProductRequest`, `UpdateProductRequest`, and `Product` models
- [ ] Implement `customer_tools.py` with `CreateCustomerRequest`, `UpdateCustomerRequest`, and `Customer` models
- [ ] Implement `business_tools.py` with `UpdateBusinessRequest` and `Business` models
- [ ] Register all domain tools in the Main Agent tool list
- [ ] Apply tenant authorization check in application service before every write
- [ ] Validate decimal price precision and non-negative stock at the Pydantic boundary
- [ ] Ensure nullable JSONB fields round-trip as `null` without becoming empty objects

## Acceptance criteria

- [ ] CRUD and reporting requests complete in one direct tool path
- [ ] All Pydantic models follow `Create{Domain}Request` / `Update{Domain}Request` / `{Domain}` naming
- [ ] Product reads return `name`, description, images, price, currency, and stock from trusted data
- [ ] Business reads apply defaults without replacing explicit tenant values
- [ ] Invalid or unauthorized operations are rejected before side effects
- [ ] No Sales knowledge retrieval occurs for operational requests
- [ ] E2E tests cover success, validation failure, not-found, and tenant isolation

## Blockers

Only [[01 Backlog/Phase 01 - Foundation and E2E Harness]].

## Execution notes

This phase can run in parallel with Phases 03-06 after the foundation contracts
are stable. All new domain tool files must follow the structure defined in
[[02 Architecture/CRUD Tool Factory]]. The factory (`crud_tool.py`) must not be
modified when adding new domains.
