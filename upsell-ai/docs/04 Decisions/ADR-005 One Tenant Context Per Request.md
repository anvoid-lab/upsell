---
type: decision
title: "ADR-005: One Tenant Context Per Request"
status: accepted
updated: 2026-09-26
related:
  - "[[02 Architecture/Repository Boundary]]"
  - "[[02 Architecture/Persistence and Context]]"
  - "[[03 Contracts/API]]"
---

# ADR-005: One Tenant Context Per Request

## Decision

The tenant of a request is resolved once, before any domain work, and published
as a single tenant context. Everything downstream receives that context instead
of a tenant identifier.

The context carries what a request is about: the tenant, the actor, the
correlation identifiers, and the business, actor, and customer the request
concerns. It is read-only, and a service may derive a narrowed copy of it.

## Rationale

Passing a bare tenant identifier invites two failure modes. A read that forgets
it crosses tenants, and a signature that carries only an id cannot express the
business or customer the request is about, so those are looked up again, or
worse, guessed from the body.

Resolving the tenant once also gives a single place where the rules live: a
request that cannot be attributed to a tenant and an actor never reaches a
service, and authentication is the only code allowed to decide that.

Making the context read-only prevents a request from mutating the identity it
was authenticated with.

## Rules

- Authentication is the only producer. Nothing else builds or repairs a context.
- A service and a repository receive the context, not an identifier. A
  repository call without one is a defect, not a fallback.
- Values that belong to one request live with that request. Shared,
  application-wide clients are never stored per request, and request data is
  never stored on the application.
- The context may be extended with the records a request resolves, but only
  from trusted persistence, never from the body.
- A path that must stay reachable without a tenant, such as a health probe, is
  declared public on purpose and is excluded from authentication.
