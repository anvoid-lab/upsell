---
type: architecture
title: Request Lifecycle and State
updated: 2026-09-26
related:
  - "[[04 Decisions/ADR-005 One Tenant Context Per Request]]"
  - "[[04 Decisions/ADR-006 Dependencies Are Declared, Not Constructed]]"
  - "[[04 Decisions/ADR-007 A Feature Is One Folder]]"
  - "[[03 Contracts/API]]"
---

# Request Lifecycle and State

Every request crosses the same boundaries, in this order, and the stack in use
is listed in [[02 Architecture/Overview]].

```text
request
  -> correlation      assigns the trace of the request
  -> authentication   resolves the tenant context, or rejects the request
  -> route            declares the body contract and the service it uses
  -> boundary check   validates the body against its contract
  -> service          applies the rules of the feature
  -> repository       applies the shared persistence rules
  -> error mapping    turns a failure into the error envelope
response
```

## Two kinds of state

| State | Holds | Lifetime |
| --- | --- | --- |
| Application state | The database client and the context cache | The process |
| Request state | The tenant context, the trace, the validated body | The request |

Application state holds only what is shared. A service is never stored there: a
service carries request data, so one instance per process would leak one
request's tenant into the next.

Request state holds only what belongs to that request. Nothing about a tenant,
an actor, or a customer is ever written to application state.

One declared type is used to read both, so a reader knows every value that can be
available. A value that was never set is absent, and a reader that tolerates its
absence asks for it explicitly.

## Middleware, grouped by concern

| Concern | Responsibility |
| --- | --- |
| Correlation | Assigns the trace of the request and echoes it on the response |
| Authentication | Reads the tenant and actor, rejects a request that cannot be scoped, publishes the tenant context |

Authentication is the only producer of the tenant context, and it runs before any
domain work. A path that must answer without a tenant, such as the health probe,
is public on purpose and is excluded.

## Dependency injection

A route declares the service it uses, and a service declares the collaborators
it needs. A shared base gives every service the same access to the current
request, the tenant context, and the shared clients. Nothing constructs a
collaborator behind the caller's back, per
[[04 Decisions/ADR-006 Dependencies Are Declared, Not Constructed]].

## Responses

A route declares the response contract of its domain, and returns that contract
directly. The status of a failure comes from the error that was raised, not from a
branch in the route. A health response is `degraded` with an explicit status when
a dependency is unavailable, so a probe can tell "wrong answer" from "no answer".
