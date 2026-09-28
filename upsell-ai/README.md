# Upsell AI

Sales copilot foundation. Supabase schema and seed data live in the sibling
`../supabase` project, linked by `upsell-ai.code-workspace`. Open that workspace
file to work across both repositories.

## Local

```bash
docker compose up -d redis
uv sync
uv run dev
```

The application starts on `http://localhost:8000`. `GET /health` reports Redis and
database status, and `POST /v1/chat` is the conversation entry point. Required
environment variables are listed in `.env.example`.

## Migration

Copilot schema changes belong to the sibling Supabase project:

```bash
cd ../supabase
supabase db push
```

`20260925230000_copilot_foundation.sql` extends `businesses` and adds `customers`
and `products` with tenant RLS. The API needs that migration applied before it can
resolve trusted customer and product data.

## Tests

Unit tests need no server, database, or cache. This is the CI command:

```bash
uv run pytest tests/unit
```

The smoke suite is a separate step because it calls a running API with real
Redis and real Supabase data:

```bash
export E2E_TENANT_ID=<businesses.id>
export E2E_ACTOR_ID=<profiles.id>
export E2E_CUSTOMER_ID=<customers.id>
export E2E_OTHER_TENANT_ID=<a different businesses.id>
uv run pytest tests/e2e/smoke.py
```

Rows with those identifiers must already exist in the sibling Supabase project.
`E2E_OTHER_TENANT_ID` proves tenant isolation. Every run generates fresh
idempotency keys, so the suite is repeatable.

If `SUPABASE_SECRET_KEY` is missing, the API still starts and `/health` reports
`degraded` with `database: unavailable`, and copilot runs return a retryable
structured error.

