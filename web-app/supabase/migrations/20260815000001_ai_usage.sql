-- ============================================================
-- VendAI — 005: contabilização de consumo da inferência
-- Colar no SQL Editor do Supabase e executar (depois da 004).
-- ============================================================
--
-- A geração de respostas passa a acontecer no serviço de inferência (`ml/`),
-- que chama um LLM pago por token. Sem um registo por chamada não há forma de
-- saber quanto cada tenant consome, nem de reconciliar a factura do provider
-- com o que a aplicação julga ter gasto.
--
-- Regista-se tanto o sucesso como o erro: uma chamada que falhou depois de
-- chegar ao modelo custou tokens na mesma, e ignorá-la faria as contas nunca
-- baterem certo.

create table if not exists ai_usage (
  id bigint generated always as identity primary key,
  business_id uuid not null references businesses(id) on delete cascade
    default current_business_id(),
  -- on delete set null: apagar uma conversa não pode apagar o histórico de
  -- custo que ela já gerou.
  conversation_id bigint references conversations(id) on delete set null,
  method text not null,
  model text,
  prompt_tokens int,
  completion_tokens int,
  total_tokens int,
  latency_ms int not null,
  status text not null check (status in ('success', 'error')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_business_idx on ai_usage (business_id);
create index if not exists ai_usage_conversation_idx on ai_usage (conversation_id);
-- Consultas de custo são sempre "quanto gastou este negócio no período X".
create index if not exists ai_usage_business_created_idx on ai_usage (business_id, created_at);

-- ─── RLS ─────────────────────────────────────────────────────
alter table ai_usage enable row level security;

-- Idempotência: recriar limpo.
drop policy if exists ai_usage_tenant on ai_usage;

create policy ai_usage_tenant on ai_usage
  for all to authenticated
  using (business_id = current_business_id())
  with check (business_id = current_business_id());
