---
type: architecture
title: Testing Strategy
updated: 2026-09-26
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

The suite reads `UPSELL_API_BASE`, `REDIS_URL`, and the seeded identifiers
`E2E_TENANT_ID`, `E2E_ACTOR_ID`, `E2E_CUSTOMER_ID`, and `E2E_OTHER_TENANT_ID`.
Identifiers must already exist in the sibling Supabase project, and each run
generates its own idempotency keys so the suite can be repeated.

**Structure per phase:**

```python
# tests/e2e/smoke.py
import httpx

BASE = "http://localhost:8000"

# --- Phase 01 ---

def test_health():
    r = httpx.get(f"{BASE}/health")
    assert r.status_code == 200

def test_chat_returns_structured_response():
    r = httpx.post(f"{BASE}/v1/chat", json={...})
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
- The error contract and the status each failure maps to
- The persistence rules of the repository, including its write operations
- A whole feature journey, resolved through its real routes with deterministic
  fakes for the cache, the database, and the model

Unit tests use `pytest` only. No test doubles unless the unit under test has
no other way to be exercised in isolation.

## What is not tested

- Individual tool function wiring (covered by smoke)
- LLM output format (non-deterministic — covered by structured output contracts)
- Internal SDK behaviour (owned by the SDK)
