-- ============================================================
-- VendAI — AI retrieval: pgvector store for web-app/ai's retrieval tool
-- ============================================================
--
-- T-005 moved AI orchestration into web-app itself (LangGraph agent, tools,
-- OpenAI called directly) — there is no separate ml/ Python service doing
-- RAG anymore. The retrieval tool needs somewhere to search, so this adds a
-- minimal pgvector-backed document store scoped per tenant, plus the RPC the
-- tool calls to search it.
--
-- This is a test-phase table: only a handful of seed rows go in for now
-- (see supabase/seed-ai-documents.ts). There is no ingestion pipeline yet —
-- ai_documents is the seam a real one would write into later.

create extension if not exists vector;

-- ─── ai_documents ──────────────────────────────────────────────
-- embedding dimension (1536) matches OpenAI's text-embedding-3-small
-- (AI_EMBEDDING_MODEL) — if that model ever changes, this column has to
-- change with it, since pgvector enforces the dimension at insert time.
create table if not exists ai_documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade default current_business_id(),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536) not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists ai_documents_business_idx on ai_documents (business_id);

-- hnsw, not ivfflat. ivfflat is the cheaper index to build, but it partitions
-- vectors into `lists` centroids trained from whatever is in the table when the
-- index is built — and this table is empty at migration time, then holds a
-- handful of seeded rows. A query scans `ivfflat.probes` lists (default: 1), so
-- with a few rows scattered across many lists, most searches would match
-- nothing and retrieval would silently look like "this business has no
-- documents". hnsw needs no training data and gives exact-ish recall at this
-- size, which is what a store seeded with `npm run seed:ai` actually needs.
create index if not exists ai_documents_embedding_idx
  on ai_documents using hnsw (embedding vector_cosine_ops);

alter table ai_documents enable row level security;

drop policy if exists ai_documents_tenant on ai_documents;
create policy ai_documents_tenant on ai_documents
  for all to authenticated
  using (business_id = current_business_id())
  with check (business_id = current_business_id());

-- ─── match_business_documents ───────────────────────────────────
-- SECURITY DEFINER, same reasoning as enqueue_suggestion_job: the cron path's
-- retrieval calls come from the service-role client, which has no auth.uid()
-- and so no current_business_id() to lean on. business_id therefore has to be
-- an explicit argument.
--
-- But SECURITY DEFINER also means this function bypasses the ai_documents_tenant
-- policy above, so the argument cannot be taken on trust: this is executable by
-- `authenticated`, and a logged-in user can call an RPC with whatever arguments
-- they like, whatever web-app/ai does server-side. Hence the second condition —
-- a caller WITH a session may only ever read its own business, and only the
-- session-less service role (current_business_id() IS NULL) may name a tenant
-- freely. Mismatches return no rows rather than raising, which is how RLS itself
-- behaves everywhere else in this schema.
create or replace function public.match_business_documents(
  p_business_id uuid,
  p_query_embedding vector(1536),
  p_match_count int default 4
) returns table (id uuid, content text, metadata jsonb, similarity float)
language sql
stable
security definer
set search_path = public
as $$
  select id, content, metadata, 1 - (embedding <=> p_query_embedding) as similarity
  from ai_documents
  where business_id = p_business_id
    and deleted_at is null
    and (current_business_id() is null or business_id = current_business_id())
  order by embedding <=> p_query_embedding
  limit greatest(p_match_count, 1);
$$;

revoke all on function match_business_documents(uuid, vector, int) from public;
grant execute on function match_business_documents(uuid, vector, int) to authenticated, service_role;
