# Development Rules

## Workflow

Every backlog phase follows:

`plan → approval → code → approval → review & refactor`

Use an Agent Team when useful. Keep the team minimal and let the lead agent decide roles, delegation, dependencies, and parallel work.

No phase may continue to the next step without explicit manual approval.

## Plan

Before implementation, produce a concise execution plan based on the task and current project context.

The plan must cover:

- what will be implemented
- affected areas
- implementation approach
- relevant architectural decisions
- expected tests
- important risks or constraints

Do not modify code or the Obsidian vault during planning.

Implementation starts only after explicit approval.

Any material scope change requires a new approval.

## Code

After approval, implement only the approved scope.

Follow established engineering principles:

- separation of concerns
- high cohesion and low coupling
- explicit contracts and boundaries
- dependency inversion
- composition over unnecessary inheritance
- boundary validation
- deterministic business rules
- defensive handling of external or model-generated data
- minimal abstractions
- maintainable control and data flow

Preserve existing architectural conventions and treat manual developer changes as authoritative.

Implement relevant tests together with the feature.

### Dependency Injection

Use FastAPI dependency injection as the standard.

Always use class-based constructor injection with `Depends()`.

Services, agents, policies, registries, repositories, and infrastructure components should be represented by classes.

Avoid factory functions such as `get_service()`, `get_agent()`, or `get_policy()` when FastAPI can construct the dependency directly.

Classes resolved through `Depends()` should normally receive only other injectable classes. Keep internal configuration values outside the HTTP dependency graph unless they intentionally represent request input.

## Review & Refactor

Review and refactoring require explicit approval after implementation.

During review, the Obsidian vault in `docs/` becomes the source of truth for architecture, decisions, rules, contracts, and constraints.

Read only the vault notes relevant to the implemented scope.

The reviewer must:

- compare the implementation against the decisions and rules already defined in the vault
- identify architectural inconsistencies, regressions, duplicated logic, weak abstractions, validation issues, security risks, and missing tests
- refactor the code when necessary to comply with the established project standards
- preserve manual developer changes and avoid unrelated refactoring
- identify new decisions or changes introduced by the completed work
- keep the relevant vault documentation synchronized with the final approved implementation

Whenever possible, review should be performed by an agent that did not primarily implement the affected code.

Do not scan the entire vault unnecessarily.