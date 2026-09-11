-- Remove web-app AI persistence. Shared upsell-ml tables are outside this migration.
-- Do not swallow errors: failure must abort instead of leaving AI jobs running.
do $$
begin
  if to_regclass('cron.job') is not null then
    perform cron.unschedule(jobid) from cron.job where jobname = 'drain-ai-suggestions';
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'ai_suggestions'
  ) then
    alter publication supabase_realtime drop table public.ai_suggestions;
  end if;
end $$;

drop function if exists public.match_business_documents(uuid, vector, integer);
drop function if exists public.enqueue_suggestion_job(bigint, uuid, integer);
drop function if exists public.drain_due_suggestion_jobs(integer);

do $$
begin
  if to_regclass('pgmq.meta') is not null then
    if exists (select 1 from pgmq.meta where queue_name = 'ai_suggestion_jobs') then
      perform pgmq.drop_queue('ai_suggestion_jobs');
    end if;
  end if;
end $$;

-- RESTRICT is intentional: unexpected external dependencies must be reviewed.
drop table if exists public.ai_documents;
drop table if exists public.ai_usage;
drop table if exists public.ai_suggestions;
drop table if exists public.ai_settings;
