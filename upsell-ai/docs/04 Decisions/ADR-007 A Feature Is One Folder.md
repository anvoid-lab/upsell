---
type: decision
title: "ADR-007: A Feature Is One Folder"
status: accepted
updated: 2026-09-26
related:
  - "[[02 Architecture/Overview]]"
  - "[[02 Architecture/Repository Boundary]]"
---

# ADR-007: A Feature Is One Folder

## Decision

Everything a feature owns lives in one folder named after it: the routes it
exposes, the services that hold its rules, and any custom persistence it needs.
Cross-cutting concerns are grouped by concern instead, in their own folder.

The generic base of each layer is extended, not copied. A feature adds a custom
component only for what the base cannot already express.

## Rationale

Scattering one feature across the tree makes a change hard to review and easy to
half-finish. Grouping by feature keeps every rule of a feature, and only those
rules, in one place.

A feature folder also makes the boundary visible: a route that holds business
rules, or a service that parses a body, stands out immediately.

## Rules

- A folder holds one feature. Naming follows the feature, not the layer, so a
  reader finds a rule by feature name.
- Cross-cutting concerns, such as authentication or correlation, are grouped
  once by concern and applied to every feature.
- The generic base is extended only when a real need appears. A custom component
  that only forwards to the base is removed.
- A custom component lives with the feature that needs it, not in a shared
  folder, until a second feature needs it.
- A layer holds only its own concern. A route validates and delegates; a service
  decides; persistence reads and writes.
