---
type: contract
title: Agent Context
updated: 2026-09-26
related:
  - "[[03 Contracts/API]]"
  - "[[03 Contracts/Agent Runtime]]"
  - "[[03 Contracts/Sales Agent Output]]"
---

# Agent Context

The Main Agent, Sales Agent, and tools share one `AgentContext`. It contains only
the data required by the AI runtime and does not mirror the web inbox domain.

## ConversationRequest

```yaml
conversation_id: string | null
customer_id: string
messages: Message[]
idempotency_key: string
metadata: Record<string, unknown>
```

`messages` must contain at least one valid message. `idempotency_key` prevents the
same request from being processed twice.

## Message

```yaml
role: user | assistant
text: string | null
links: string[]
media:
  - url: string
```

A message must contain at least one non-empty value in `text`, `links`, or
`media`.

## AgentContext

```yaml
request_id: string
run_id: string
conversation_id: string | null
customer: Customer
business: Business
products: Product[]
messages: Message[]
state: Record<string, unknown>
response: AgentResponse | null
```

`response` starts as `null` and uses the shared contract from
[[03 Contracts/API]]. `state` stores evolving runtime state; it is not the source
of truth for business data. The complete context is cached in Redis under a key
scoped by `tenant_id` and `customer_id` as described in
[[02 Architecture/Redis Context Cache]]. `tenant_id` is the `X-Tenant-Id` request
header and matches `businesses.id` in the sibling Supabase project. Price and
stock are never stored in the cached value.

## Customer

```yaml
id: string
name: string
email: string | null
phone: string | null
language: string | null
timezone: string | null
status: lead | customer | inactive
metadata: Record<string, unknown>
created_at: datetime
updated_at: datetime
```

## Business

```yaml
id: string
name: string
description: string | null
industry: string | null
email: string | null
phone: string | null
website: string | null
logo_url: string | null
country_code: string = "AO"
timezone: string = "Africa/Luanda"
locale: string = "pt-AO"
currency: string = "AOA"
address: Record<string, unknown> | null
business_hours: Record<string, unknown> | null
metadata: Record<string, unknown> | null
created_at: datetime
updated_at: datetime
deleted_at: datetime | null
```

Stable scalar fields are relational columns. `address`, `business_hours`, and
`metadata` are nullable JSONB columns. The defaults are application and database
defaults and can be overridden per business.

## Product

```yaml
id: string
business_id: string
sku: string
name: string
description: string | null
category: string | null
subcategory: string | null
price: decimal
currency: string
stock: integer
images:
  - url: string
attributes: Record<string, unknown>
metadata: Record<string, unknown>
active: boolean
created_at: datetime
updated_at: datetime
deleted_at: datetime | null
```

`price` uses a fixed-precision decimal. `stock` is a non-negative integer.
`images`, `attributes`, and `metadata` are JSONB values. The application never
lets the model invent price or stock.

## Contract Structure and Validation

Contracts are organized into individual modules under `core/contracts/**.py`:

- `core/contracts/base.py` — `ContractModel` (rejects extra fields) and `RecordModel` (tolerates additive fields)
- `core/contracts/message.py` — `Message`, `Media`, `MessageRole`
- `core/contracts/conversation_request.py` — `ConversationRequest`
- `core/contracts/customer.py` — `Customer`, `CustomerStatus`
- `core/contracts/business.py` — `Business`
- `core/contracts/product.py` — `Product`, `ProductImage`
- `core/contracts/error_detail.py` — `ErrorDetail`
- `core/contracts/agent_response.py` — `AgentResponse`, `ResponseType`
- `core/contracts/agent_context.py` — `AgentContext`
- `core/contracts/health.py` — `HealthResponse`
- `core/contracts/validate_contract.py` — `validate_contract(model_cls, data)`,
  which fails with an application error

Incoming user requests such as `ConversationRequest` are validated at the route
boundary, declared per route as a dependency (`validated_body` in
`app/api/validators.py`) using `validate_contract`. If validation fails, the
request is rejected with HTTP 400 and a structured error envelope before the
service runs.

