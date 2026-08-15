-- ============================================================
-- VendAI — suggestion queue: debounce + presence
-- ============================================================
--
-- The webhook generated a suggestion on EVERY inbound message. A customer
-- typing three separate bubbles in a burst spent three LLM calls, and only the
-- last one was ever going to matter.
--
-- This swaps direct generation for a delayed queue (pgmq): the webhook stops
-- generating and only enqueues — and before enqueueing it deletes whatever was
-- already pending for the same conversation. That delete-then-send is the
-- debounce: a burst of messages keeps replacing the same job instead of piling
-- several up.
--
-- The queue is drained by `pg_cron`, which runs INSIDE this project's own
-- Postgres, so there is no worker process for the app to keep alive. On each
-- tick it calls the app's /api/jobs/drain-suggestions endpoint via `pg_net`.
--
-- IMPORTANT: `pg_cron` cannot reach `localhost` — it only works against a real
-- public URL. The scheduling part is ready but inert until a deploy exists (see
-- the `cron.schedule` block at the bottom and the manual steps after it).
-- Testing in development is done by hand, with scripts/drain-suggestions.sh.

create extension if not exists pgmq;
create extension if not exists pg_cron;
create extension if not exists pg_net;

select pgmq.create('ai_suggestion_jobs');

-- Presence: heartbeat written by the open chat panel, read by the drain
-- endpoint to decide whether generating is worth it. Inherits the RLS policy
-- already on `conversations` — it is just another column on an
-- already-tenant-scoped table, so no new policy is needed.
alter table conversations add column if not exists last_viewed_at timestamptz;

-- ─── Enqueue (with debounce) ───────────────────────────────────
-- security definer because the caller (the webhook) uses the secret key, which
-- has no direct access to the `pgmq` schema — only to what PostgREST exposes,
-- which by default is just `public`. This function is the app's only way to
-- talk to the queue.
create or replace function public.enqueue_suggestion_job(
  p_conversation_id bigint,
  p_business_id uuid,
  p_delay_seconds int default 12
) returns void
language plpgsql
security definer
set search_path = public, pgmq
as $$
begin
  -- The debounce itself: drop whatever was already pending for this
  -- conversation before adding the new one. `pgmq` has no replace-by-key
  -- primitive, so this does the same thing directly against the table that
  -- `pgmq.create()` above produced.
  delete from pgmq.q_ai_suggestion_jobs
   where (message->>'conversation_id')::bigint = p_conversation_id;

  perform pgmq.send(
    'ai_suggestion_jobs',
    jsonb_build_object(
      'conversation_id', p_conversation_id,
      'business_id', p_business_id
    ),
    p_delay_seconds
  );
end;
$$;

-- ─── Drain whatever is due ─────────────────────────────────────
-- `pgmq.pop()` only takes a queue name and returns a single message, so a
-- batch drain goes through `read` + `delete`: read() hands out up to p_max
-- messages and hides them for the visibility timeout using FOR UPDATE SKIP
-- LOCKED, so two overlapping drains never receive the same job. Deleting
-- straight after taking it makes this equivalent to a batch pop; the timeout
-- only matters if this function dies midway, in which case the job reappears
-- instead of being lost.
create or replace function public.drain_due_suggestion_jobs(p_max int default 20)
returns setof jsonb
language plpgsql
security definer
set search_path = public, pgmq
as $$
declare
  job record;
begin
  for job in select * from pgmq.read('ai_suggestion_jobs', 30, p_max)
  loop
    perform pgmq.delete('ai_suggestion_jobs', job.msg_id);
    return next job.message;
  end loop;
end;
$$;

-- ─── Schedule — inert until a real deploy exists ───────────────
-- References secrets by NAME (Vault), never by value: this migration lives in
-- git, and a real secret has no business in a version-controlled file.
--
-- The `vault.create_secret(...)` calls that give these names real values are
-- NOT part of this migration — they are a manual step, run once in the SQL
-- Editor once a deploy URL exists, the same way SUPABASE_SECRET_KEY and
-- SEED_DEV_PASSWORD live only in .env.local and never in a committed file:
--
--   select vault.create_secret('https://your-app.example.com', 'jobs_base_url');
--   select vault.create_secret('<same value as INTERNAL_JOBS_SECRET>', 'internal_jobs_secret');
--
-- Until that step is done this fires every 10s and does nothing (the lookup in
-- vault.decrypted_secrets returns null) — harmless, and recorded in
-- cron.job_run_details.
select cron.schedule('drain-ai-suggestions', '10 seconds', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'jobs_base_url') || '/api/jobs/drain-suggestions',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-internal-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'internal_jobs_secret')
    )
  );
$$);
