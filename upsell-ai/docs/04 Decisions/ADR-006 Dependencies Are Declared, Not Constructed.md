---
type: decision
title: "ADR-006: Dependencies Are Declared, Not Constructed"
status: accepted
updated: 2026-09-26
related:
  - "[[02 Architecture/Overview]]"
  - "[[02 Architecture/Testing Strategy]]"
  - "[[04 Decisions/ADR-005 One Tenant Context Per Request]]"
---

# ADR-006: Dependencies Are Declared, Not Constructed

## Decision

A component states what it needs and receives it. Nothing reaches for a global
client, a module-level singleton, or a hidden service locator.

Each domain defines its own dependency, so a route declares the service it uses
and the service declares its collaborators. A shared base gives every service
the same access to the current request.

## Rationale

Constructed dependencies hide what a component needs. Reading a global is
invisible at the call site, impossible to substitute, and turns a unit test into
an integration test with real infrastructure.

A declared dependency is visible, substitutable, and fails loudly at startup when
it cannot be resolved, instead of at the first request that needs it.

## Rules

- A component that needs a collaborator declares it. A component never reaches
  for a global.
- A service is resolved per request. It is never built once and stored, because
  a service holds request data.
- A shared base offers the request, the tenant context, and the shared clients,
  so no service repeats that wiring.
- Behavior lives in plain data structures with declared fields. A component
  with no behavior of its own is a data shape, not a class.
- Long-lived stateless collaborators may be reused. They are still declared.
- Tests substitute a declared dependency instead of patching a global.
