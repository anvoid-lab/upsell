-- `documents` / `match_documents` (see 20260816115403_vector_store.sql) hold the
-- Sales Brain's own platform knowledge (methodology, base playbooks) — shared
-- across every tenant, so they stay untouched and keep no `tenant_id`.
--
-- `tenant_documents` / `match_tenant_documents` are a separate vector store for
-- per-tenant knowledge (account history, a tenant's own product docs/playbooks).
-- Isolation is enforced by the mandatory `match_tenant_id` parameter, not by RLS:
-- the Python pipeline always connects as `service_role`, which bypasses RLS by
-- definition, so a policy here would be decorative. RLS is still enabled with no
-- policies for the same reason as `documents` — belt-and-braces against
-- anon/authenticated ever being granted REST access.

create table if not exists tenant_documents (
  id bigserial primary key,
  tenant_id text not null,
  content text,
  metadata jsonb,
  embedding vector(768)
);

alter table tenant_documents enable row level security;

create index if not exists tenant_documents_tenant_id_idx on tenant_documents (tenant_id);

create index if not exists tenant_documents_embedding_idx on tenant_documents using hnsw (embedding vector_cosine_ops);

create or replace function match_tenant_documents (
  query_embedding vector(768),
  match_tenant_id text,
  match_count int default null,
  filter jsonb default '{}'
) returns table (id bigint, content text, metadata jsonb, similarity float)
language plpgsql as $$
begin
  return query
  select tenant_documents.id, tenant_documents.content, tenant_documents.metadata,
         1 - (tenant_documents.embedding <=> query_embedding) as similarity
  from tenant_documents
  where tenant_documents.tenant_id = match_tenant_id
    and tenant_documents.metadata @> filter
  order by tenant_documents.embedding <=> query_embedding
  limit match_count;
end;
$$;

revoke all on function match_tenant_documents(vector, text, int, jsonb) from public;

grant execute on function match_tenant_documents(vector, text, int, jsonb) to service_role;
