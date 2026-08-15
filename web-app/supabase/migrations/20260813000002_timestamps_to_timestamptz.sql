-- ============================================================
-- VendAI — 002: colunas de tempo em texto → timestamptz
-- Colar no SQL Editor do Supabase e executar (depois da 001).
-- ============================================================
--
-- Contexto: last_message_at, messages.timestamp e channels.connected_at
-- guardavam strings já formatadas para apresentação ("23:24", "15 Jan 2025").
-- Não são ordenáveis nem comparáveis por intervalo, o que bloqueia o
-- scheduler de follow-ups, a detecção de silêncio e as analytics reais.
--
-- A formatação passa a ser responsabilidade da camada de apresentação.

-- ─── Helper de conversão tolerante ───────────────────────────
-- Valores como "23:24" ou "15 Jan 2025" não têm data completa e não são
-- recuperáveis. Em vez de rebentar, devolvem NULL e são substituídos pelo
-- created_at da própria linha.
create or replace function _safe_timestamptz(v text)
returns timestamptz
language plpgsql
immutable
as $$
begin
  if v is null or btrim(v) = '' then
    return null;
  end if;
  return v::timestamptz;
exception when others then
  return null;
end;
$$;

-- ─── conversations.last_message_at ───────────────────────────
-- NOT NULL preservado: o coalesce nunca produz NULL porque created_at é NOT NULL.
alter table conversations
  alter column last_message_at type timestamptz
  using coalesce(_safe_timestamptz(last_message_at), created_at);

alter table conversations
  alter column last_message_at set default now();

-- ─── messages.timestamp ──────────────────────────────────────
-- "timestamp" precisa de aspas — colide com o nome do tipo.
alter table messages
  alter column "timestamp" type timestamptz
  using coalesce(_safe_timestamptz("timestamp"), created_at);

alter table messages
  alter column "timestamp" set default now();

-- ─── follow_ups ──────────────────────────────────────────────
alter table follow_ups
  alter column scheduled_for type timestamptz
  using _safe_timestamptz(scheduled_for);

alter table follow_ups
  alter column sent_at type timestamptz
  using _safe_timestamptz(sent_at);

-- ─── channels.connected_at ───────────────────────────────────
alter table channels
  alter column connected_at type timestamptz
  using _safe_timestamptz(connected_at);

-- ─── Índices que estas colunas passam a permitir ─────────────

-- O scheduler (T-009) varre follow-ups vencidos: índice parcial só sobre as
-- linhas que lhe interessam.
create index if not exists follow_ups_due_idx
  on follow_ups (scheduled_for)
  where status = 'scheduled' and deleted_at is null;

-- Ordenação da lista de conversas por actividade recente.
create index if not exists conversations_last_message_at_idx
  on conversations (last_message_at desc);

-- Ordenação de mensagens dentro de uma conversa.
create index if not exists messages_conversation_timestamp_idx
  on messages (conversation_id, "timestamp");

-- ─── Limpeza ─────────────────────────────────────────────────
drop function if exists _safe_timestamptz(text);

-- ─── Nota ────────────────────────────────────────────────────
-- contact.first_contact vive dentro do JSONB conversations.contact e
-- permanece string ISO — o JSONB não tem tipo temporal nativo. É convertido
-- para Date na fronteira do contrato (ContactContract).
