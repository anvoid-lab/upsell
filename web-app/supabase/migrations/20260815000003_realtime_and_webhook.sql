-- ============================================================
-- VendAI — 007: Realtime para a inbox reativa
-- Colar no SQL Editor do Supabase e executar (depois da 006).
-- ============================================================
--
-- A inbox deixa de ser um snapshot do momento em que a página carregou. O
-- webhook de canais (src/app/api/webhooks/channel/) escreve a mensagem que o
-- cliente enviou e é a própria escrita que propaga para o browser — o Supabase
-- Realtime ouve o WAL do Postgres e empurra a linha para quem estiver subscrito.
--
-- Isto vale para QUALQUER caminho de escrita: o webhook, o vendedor a responder,
-- o `npm run seed`, e o scheduler de follow-ups (T-009) quando existir. Nenhum
-- deles precisa de saber que alguém está a ouvir.
--
-- `ai_suggestions` está na lista de propósito: é o que torna o fluxo de IA
-- reativo. O webhook gera a sugestão em segundo plano (depois de já ter
-- respondido ao provider) e o painel aberto recebe-a empurrada, sem polling.
--
-- Segurança: o Postgres Changes aplica o RLS de cada subscritor. As políticas
-- `*_tenant` da migração 003 são, por isso, também a autorização do socket —
-- um tenant nunca recebe eventos de linhas que não pode ler. Não há uma segunda
-- camada de autorização para manter em sincronia.

-- A publication `supabase_realtime` já existe num projeto Supabase novo; o
-- bloco abaixo evita falhar caso tenha sido removida.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;

-- `add table` falha se a tabela já estiver publicada — daí verificar primeiro,
-- para a migração poder ser reexecutada sem erro.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table conversations;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ai_suggestions'
  ) then
    alter publication supabase_realtime add table ai_suggestions;
  end if;
end
$$;

-- Nota sobre idempotência do webhook: não é preciso acrescentar nada aqui.
-- A migração 004 já criou `messages.channel_message_id text unique` e
-- `conversations.channel_conversation_id text unique`, reservados exatamente
-- para o id da plataforma externa. A constraint UNIQUE é a chave de
-- idempotência — a Meta reenvia entregas, e a segunda tem de ser um no-op.
