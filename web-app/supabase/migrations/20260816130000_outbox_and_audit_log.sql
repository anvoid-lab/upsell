-- Fase 1B: outbox pattern + append-only audit log.
--
-- No queue product (pgmq or otherwise) is used here — the classic Transactional
-- Outbox pattern only needs an atomic write (business mutation + this table, same
-- Postgres transaction) plus a poller. A queue engine buys retry/visibility-timeout
-- semantics that only matter with a real separate consumer process/service, which
-- doesn't exist yet (Knowledge Graph/Execution layers are not implemented). Consumer idempotency
-- is handled by the `idempotency_key` unique constraint, checked at apply time —
-- that's independent of whether the source is a queue or a plain table.

create table if not exists outbox_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  trace_id text not null,
  span_id text,
  handoff text not null,
  payload jsonb not null,
  idempotency_key text not null unique,
  status text not null default 'pending' check (status in ('pending', 'processing', 'applied', 'failed')),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table outbox_events enable row level security;

create index if not exists outbox_events_pending_idx on outbox_events (created_at) where status = 'pending';

-- Append-only audit log (docs/07 §9 AuditEnvelope). RLS stays enabled with no
-- policies for the same reason as `documents`/`tenant_documents` — service_role
-- bypasses RLS, so the real enforcement is the revoked update/delete grants below.

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id text,
  trace_id text,
  actor text not null,
  actor_role text,
  action text not null,
  ts timestamptz not null,
  policy_version text,
  playbook_version text,
  justification text,
  override_reason text,
  created_at timestamptz not null default now()
);

alter table audit_log enable row level security;

grant insert, select on audit_log to service_role;

revoke update, delete, truncate on audit_log from service_role;
