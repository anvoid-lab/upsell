---
type: decision
title: "ADR-004: Errors Are Declared, Not Built In Place"
status: accepted
updated: 2026-09-26
related:
  - "[[03 Contracts/API]]"
  - "[[02 Architecture/Overview]]"
---

# ADR-004: Errors Are Declared, Not Built In Place

## Decision

Every failure the system reports is an instance of one application error type.
No layer assembles an error response by hand. Raising the error is the only
supported way to fail, and the error carries everything needed to report it:

- the human-safe message
- a stable, machine-readable code
- the status to answer with
- whether the caller may retry
- optional per-field details for a rejected payload

The status is declared by the error, never derived at the boundary, and there
are no presets or shortcuts: one call site that needs an error writes it, so a
reader can see the whole contract of that failure where it happens.

## Rationale

Hand-built error responses drift. Two layers that each build an error envelope
disagree on codes, statuses, and wording, and a caller cannot tell a rejection
from a failure. A single error type makes the mapping from cause to response
predictable and testable, and makes it impossible to return an error without
recording it.

The error is also the logging point. Because raising it is the only way to fail,
the log of a failure cannot be forgotten at a call site.

## Rules

- A layer raises the error; it never builds a response body.
- An error message is written for the caller, never for the log. Details that
  only help debugging go to the log, not to the response.
- A failure that a caller can safely repeat is marked retryable, and a
  non-retryable failure is not answered as if the caller should try again.
- A decision that denies an action is reported through the same error type, so
  a denial is a structured result and never a model decision.
- The mapping to a response lives in one place, apart from the composition
  root, so every entry point reports failures identically.
