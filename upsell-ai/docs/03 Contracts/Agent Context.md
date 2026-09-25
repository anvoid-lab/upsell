---
type: contract
title: Agent Context
updated: 2026-09-25
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
scoped by `business_id` and `customer_id` as described in
[[02 Architecture/Redis Context Cache]].

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
