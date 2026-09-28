---
type: architecture
title: CRUD Tool Factory
updated: 2026-09-25
related:
  - "[[02 Architecture/Agent Boundaries]]"
  - "[[02 Architecture/Repository Boundary]]"
  - "[[01 Backlog/Phase 02 - Direct Business Operations]]"
  - "[[03 Contracts/Agent Context]]"
---

# CRUD Tool Factory

## Purpose

Provides a declarative factory for registering typed Supabase CRUD operations as
OpenAI Agents SDK `function_tool` entries. Each domain file declares its tools
using `ToolSpec` without touching the factory implementation.

## Components

### `ToolSpec`

Dataclass that carries the configuration for a single tool:

```python
@dataclass
class ToolSpec:
    name: str           # name exposed to the LLM
    table: str          # Supabase table target
    description: str    # when-to-use guidance for the LLM
    request: type[BaseModel] | None = None
    response: type[BaseModel] | None = None
```

### Factory functions

| Function | Signature exposed to the agent | Required `ToolSpec` fields |
|---|---|---|
| `insert_tool(spec)` | `(data: RequestModel)` | `request` |
| `get_tool(spec)` | `(id: int)` | — |
| `search_tool(spec)` | `(query: str \| None, limit: int)` | — |
| `update_tool(spec)` | `(id: int, data: RequestModel)` | `request` |

Each factory returns a `@function_tool`-decorated coroutine with
`name_override` and `description_override` applied from `ToolSpec`.

## Naming conventions

### Pydantic models

All request and response models must follow this pattern:

| Purpose | Pattern | Example |
|---|---|---|
| Create payload | `Create{Domain}Request` | `CreateProductRequest` |
| Update payload | `Update{Domain}Request` | `UpdateProductRequest` |
| Read / response | `{Domain}` | `Product` |

This rule applies to every domain registered through the factory (products,
customers, businesses, etc.).

### Tool names

Tool names follow `{verb}_{domain}` in snake_case and must match the `name`
field in `ToolSpec`:

| Verb | Example |
|---|---|
| `get` | `get_product` |
| `search` | `search_products` |
| `insert` | `insert_product` |
| `update` | `update_product` |

## Domain file structure

Each domain lives in its own file under `agents/tools/`:

```
agents/tools/
  crud_tool.py          # factory — never modified per domain
  product_tools.py      # product domain tools
  customer_tools.py     # customer domain tools
  business_tools.py     # business domain tools
```

A domain file contains:
1. Pydantic models (`Create{Domain}Request`, `Update{Domain}Request`, `{Domain}`)
2. Tool instances produced by the factory functions

## Description contract

The `description` field in `ToolSpec` must answer **when** the agent should call
this tool, not how it works internally. Use present tense, start with the action,
and reference user intent:

```python
description=(
    "Search products in the catalog. "
    "Use this tool when the user wants to find products, "
    "check availability or browse existing products."
)
```

## Extending to a new domain

1. Create `agents/tools/{domain}_tools.py`.
2. Define `Create{Domain}Request`, `Update{Domain}Request`, and `{Domain}` models.
3. Instantiate the required factory calls with a `ToolSpec` per tool.
4. Register the tools in the relevant agent's tool list.
5. No changes to `crud_tool.py` are required.
