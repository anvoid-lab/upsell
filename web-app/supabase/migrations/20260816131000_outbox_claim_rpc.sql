-- Atomic claim for outbox_events. `for update skip locked` needs a single SQL
-- statement to be race-free across concurrent claimers — the PostgREST table API
-- (used for enqueue/mark_applied/mark_failed, plain keyed writes with no race) can't
-- express that, so this is the one operation that needs an RPC.

create or replace function claim_outbox_events(p_limit int default 10)
returns setof outbox_events
language plpgsql
as $$
begin
  return query
  update outbox_events
  set status = 'processing'
  where id in (
    select id from outbox_events
    where status = 'pending'
    order by created_at
    limit p_limit
    for update skip locked
  )
  returning *;
end;
$$;

revoke all on function claim_outbox_events(int) from public;

grant execute on function claim_outbox_events(int) to service_role;
