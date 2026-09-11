-- Fase 2 (brain-v0): durable interaction lifecycle for the Brain orchestrator.
--
-- Two tables, because they answer two different questions:
--   * `brain_lifecycle` is the resumable snapshot — "where is this trace now, and with
--     what accumulated context?". One mutable row per trace_id; this is what a restart
--     reloads to resume at the last state.
--   * `brain_state_transitions` is the append-only history — "how did it get there?".
--     Required by docs/005 §8 (every transition emits state_from/state_to), and it is
--     also the evidence the dispatch guard reads: an ExecutionPlan may only be
--     dispatched for a trace that has a persisted transition into RECONCILING.
--
-- The history is therefore security-relevant, not just observability: if a row could be
-- rewritten or deleted, the "never dispatch without reconciliation" invariant could be
-- forged. Hence the same database-level append-only enforcement used for `audit_log`
-- (migration 20260816130000) — revoked update/delete/truncate, so even the pipeline
-- running as service_role cannot alter history after the fact.

create table if not exists brain_lifecycle (
  trace_id text primary key,
  tenant_id text not null,
  state text not null check (state in (
    'RECEIVED', 'INTERPRETING', 'STRATEGIZING', 'ENRICHING', 'RETRIEVING',
    'RECONCILING', 'PLANNING', 'AWAITING_APPROVAL', 'EXECUTING',
    'COMPLETED', 'FAILED', 'COMPENSATED'
  )),
  event jsonb not null,
  context jsonb not null default '{}'::jsonb,
  degraded_mode text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table brain_lifecycle enable row level security;

-- Resume scans look for lifecycles that are neither closed nor waiting on a human.
create index if not exists brain_lifecycle_resumable_idx
  on brain_lifecycle (tenant_id, updated_at)
  where state not in ('COMPLETED', 'COMPENSATED', 'AWAITING_APPROVAL');

create table if not exists brain_state_transitions (
  id uuid primary key default gen_random_uuid(),
  trace_id text not null references brain_lifecycle (trace_id),
  tenant_id text not null,
  state_from text,
  state_to text not null,
  span_id text,
  reason text,
  ts timestamptz not null default now()
);

alter table brain_state_transitions enable row level security;

create index if not exists brain_state_transitions_trace_idx
  on brain_state_transitions (trace_id, ts);

-- RLS stays enabled with no policies for the same reason as `documents` /
-- `tenant_documents` / `audit_log`: service_role bypasses RLS by definition, so the
-- real enforcement is the grants below — RLS is the safety net if anon/authenticated
-- ever gain REST access.
grant select, insert, update on brain_lifecycle to service_role;

revoke delete, truncate on brain_lifecycle from service_role;

grant select, insert on brain_state_transitions to service_role;

revoke update, delete, truncate on brain_state_transitions from service_role;
