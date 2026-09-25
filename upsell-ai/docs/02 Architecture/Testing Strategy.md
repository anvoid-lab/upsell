---
type: architecture
title: Testing Strategy
updated: 2026-09-25
related:
  - "[[01 Backlog/Phase 01 - Foundation and E2E Harness]]"
  - "[[04 Decisions/ADR-003 Async First]]"
---

# Testing Strategy

## Philosophy

Prefer real confidence over test infrastructure. Tests run against the real
stack — no fake adapters, no mock databases, no stubbed LLM responses.
The goal is to verify that the system works end to end, not to prove that
individual units call each other correctly.

## Smoke tests — `tests/e2e/smoke.py`

A single file that evolves with each phase. Each phase adds its own test
functions to the same file. Tests hit a running local server with real data.

Run with:

```bash
pytest tests/e2e/smoke.py
```

The server must be running before executing the smoke suite. Each function
targets one critical path and asserts on HTTP status and response shape.

**Structure per phase:**

```python
# tests/e2e/smoke.py
import httpx

BASE = "http://localhost:8000"

# --- Phase 01 ---

def test_health():
    r = httpx.get(f"{BASE}/health")
    assert r.status_code == 200

def test_copilot_run_returns_structured_response():
    r = httpx.post(f"{BASE}/v1/copilot/runs", json={...})
    assert r.status_code == 200
    assert "status" in r.json()

# --- Phase 02 ---
# product, customer, business operations added here
```

As phases are completed, new test functions are appended. No tests are removed
unless the behaviour they cover is explicitly removed.

## Unit tests — `tests/unit/`

Written only for logic where correctness cannot be verified through the smoke
suite alone. This includes:

- Tenant authorization and isolation rules
- Price precision and stock validation
- Cache key construction and TTL policy
- Policy denial logic

Unit tests use `pytest` only. No test doubles unless the unit under test has
no other way to be exercised in isolation.

## What is not tested

- Individual tool function wiring (covered by smoke)
- LLM output format (non-deterministic — covered by structured output contracts)
- Internal SDK behaviour (owned by the SDK)
