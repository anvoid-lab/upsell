---
description: JARVIS formal specification workflow with TLA+ (analyze, validate, report) for agent-driven implementation and tech-lead review
---

Use this skill when a card has non-trivial state transitions, concurrency risks, or strict invariants.

## Intent

Introduce a formal pre-coding validation loop:

1. Analyze if formal spec is required.
2. Validate TLA+ model with TLC.
3. Generate human-review artifacts in vault.

## Commands

1. Analyze card complexity:

```bash
formal-spec-analyze card_id="CD-XXX"
```

2. Validate the model:

```bash
formal-spec-validate \
  spec_path="/abs/path/obsidian-vault/13-Formal-Specs/CD-XXX/spec.tla" \
  config_path="/abs/path/obsidian-vault/13-Formal-Specs/CD-XXX/spec.cfg"
```

3. Generate review artifacts:

```bash
formal-spec-report \
  card_id="CD-XXX" \
  summary="State transition protocol validated" \
  valid=true \
  duration_ms=820 \
  errors=[] \
  warnings=[] \
  states_found=172 \
  distinct_states=61 \
  depth=9
```

## Human Tech-Lead Consumption

Review in this order:

1. `12-Scope-Docs/CD-XXX-*.md`
2. `13-Formal-Specs/CD-XXX/report.md`
3. `13-Formal-Specs/CD-XXX/diagram.mermaid`
4. `13-Formal-Specs/CD-XXX/spec.tla` (only if deeper inspection is required)

Go/No-Go rules:

- Go: validation PASS and invariants align with scope/value.
- No-Go: validation FAIL, missing artifacts, or ambiguous invariants.

## Notes

- TLC requires Java runtime and `vendor/tla2tools.jar`.
- Keep models focused on business behavior, not implementation classes/method names.
- For trivial cards (text/config-only), skip formal spec with explicit rationale.
