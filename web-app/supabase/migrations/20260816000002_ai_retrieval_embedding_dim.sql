-- ============================================================
-- VendAI — ai_retrieval: switch embedding dimension to 768
-- ============================================================
--
-- 20260816000001 sized ai_documents.embedding for OpenAI's
-- text-embedding-3-small (1536 dims). The project's actual OPENAI_BASE_URL
-- points at Ollama Cloud, whose OpenAI-compatible endpoint doesn't serve
-- OpenAI's own embedding models — AI_EMBEDDING_MODEL is now
-- nomic-embed-text, which is 768-dimensional. ai_documents is empty (the
-- previous migration only just ran, and seeding failed before writing
-- anything), so this is a plain type change, not a backfill.
--
-- If AI_EMBEDDING_MODEL ever changes again, this column has to change with
-- it — pgvector enforces the dimension at insert time.

alter table ai_documents
  alter column embedding type vector(768);

drop index if exists ai_documents_embedding_idx;
create index ai_documents_embedding_idx
  on ai_documents using hnsw (embedding vector_cosine_ops);

create or replace function public.match_business_documents(
  p_business_id uuid,
  p_query_embedding vector(768),
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

-- pgvector's dimension (the `(768)` in `vector(768)`) is a typmod, not part
-- of the type itself — Postgres identifies a function's signature by base
-- type only, so `vector(1536)` and `vector(768)` are the same overload as
-- far as CREATE OR REPLACE / GRANT / DROP FUNCTION are concerned. The
-- `create or replace function` above already replaced the old definition in
-- place; a `vector(1536)` reference here would resolve to that same
-- function and drop what was just created, not some other leftover one.

revoke all on function match_business_documents(uuid, vector, int) from public;
grant execute on function match_business_documents(uuid, vector, int) to authenticated, service_role;
