create extension if not exists vector;

-- This project's Supabase database is shared with web-app (ai_documents /
-- match_business_documents). documents / match_documents belong to the
-- upsell-ml RAG demo only and are only ever touched by the Python indexing
-- pipeline via the service_role key — RLS is enabled with no policies so
-- anon/authenticated can never read or write this table via the REST API,
-- and the function's execute grant is likewise restricted to service_role.

create table if not exists documents (
  id bigserial primary key,
  content text,
  metadata jsonb,
  embedding vector(768)
);

alter table documents enable row level security;

create index if not exists documents_embedding_idx on documents using hnsw (embedding vector_cosine_ops);

create or replace function match_documents (
  query_embedding vector(768),
  match_count int default null,
  filter jsonb default '{}'
) returns table (id bigint, content text, metadata jsonb, similarity float)
language plpgsql as $$
begin
  return query
  select documents.id, documents.content, documents.metadata,
         1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where documents.metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;

revoke all on function match_documents(vector, int, jsonb) from public;

grant execute on function match_documents(vector, int, jsonb) to service_role;
