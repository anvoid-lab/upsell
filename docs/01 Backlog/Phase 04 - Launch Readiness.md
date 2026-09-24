---
type: phase
phase: 4
title: Launch Readiness
status: planned
priority: medium
depends_on:
  - "[[01 Backlog/Phase 01 - Real Channel MVP]]"
  - "[[01 Backlog/Phase 02 - Inbox Persistence and Recovery]]"
updated: 2026-09-24
related:
  - "[[02 Architecture/Frontend and Operations]]"
  - "[[03 Contracts/Analytics]]"
---

# Phase 04 - Launch Readiness

## Objective

Prepare the system for repeatable daily operation with real metrics, team-safe usage,
and production support expectations.

## Deliverables

- [ ] Real analytics definitions and data aggregation
- [ ] Pagination and search for larger inboxes
- [ ] Team, permissions, and assignment model
- [ ] Account recovery, mobile UX, and operational runbooks
- [x] Supported lint configuration and a clean lint baseline

## Backlog

- [ ] Replace simulated analytics with verified production metrics
- [ ] Add pagination and search that work with Realtime updates
- [ ] Introduce real users, invitations, and role-aware permissions
- [ ] Finalize account recovery and production email delivery
- [ ] Improve mobile experience and operational monitoring
- [ ] Extend test coverage for real journeys and multi-tenant safety
- [x] Replace the incompatible `next lint` script with a supported configuration and resolve its reported errors

## Acceptance criteria

- [ ] No dashboard panel presents placeholder values as real metrics
- [ ] Large inboxes remain usable without loading complete history
- [ ] Multi-user company access is permissioned and isolated
- [ ] Production operations have monitoring and recovery guidance
- [x] Lint runs through a supported command and reports no outstanding errors

## Blockers

- Final shape of team permissions and commercial outcome attribution

## Execution notes

This phase groups backlog items `T-016`, `T-017`, `T-018`, `T-020`, `T-023`,
`T-025`, `T-032`, `T-034`, and related launch work. It should start only after the
inbox journey is reliable for real usage. `T-025` is complete: `npm run lint` uses
ESLint directly and passed with no warnings on 2026-09-24.
