---
type: contract
title: Analytics
updated: 2026-09-15
related:
  - "[[02 Architecture/Frontend and Operations]]"
  - "[[01 Backlog/Phase 04 - Launch Readiness]]"
---

# Analytics

## Meaning

The analytics contract describes the shape of dashboard summary data returned to the
analytics overview UI.

## Main structures

- KPI cards with labels, values, deltas, positivity, and icon keys
- Conversation chart data by date
- Platform statistics by supported channel type

## Validation notes

- Platform stats reuse the same channel type enum as the inbox domain
- The contract enforces structure, but not whether the values are truly production
  derived or still placeholder values

## Current reality

The contract is stable enough for the UI, but the backlog notes that historical
series, conversion logic, and several dashboard values remain partially simulated.

## Why it matters

This note is a reminder that a strong typed contract does not guarantee a finished
metric definition. The remaining work is semantic, not only structural.
